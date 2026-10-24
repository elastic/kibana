/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Kibana's inference route rejects a request whose body exceeds its configured cap:
 *
 *     POST /internal/inference/prompt -> HTTP 413 Payload Too Large
 *     {"statusCode":413,"error":"Request Entity Too Large",
 *      "message":"Payload content length greater than maximum allowed: 1679958"}
 *
 * The number is the server limit (`@hapi/subtext` builds the message as
 * `Boom.entityTooLarge('Payload content length greater than maximum allowed: ' + options.maxBytes)`),
 * not the size of the request that was sent.
 *
 * The groundedness judge embeds the whole tool-call history
 * (`tool_call_history: JSON.stringify(steps)`), so a long-but-legitimate run composes a request
 * past that cap and the evaluator can never score the cell. Bounding the serialized history keeps
 * the request inside the cap while preserving the head of every tool result, so the judge still
 * sees the evidence it grades.
 *
 * Only the copy the judge reads is bounded — the verbatim transcript is untouched. A transcript
 * that already fits is returned byte-identical, so short runs keep scoring exactly what they
 * scored before this module existed.
 */

export const JUDGE_TRANSCRIPT_BUDGET_ENV = 'KBN_EVALS_JUDGE_TRANSCRIPT_BUDGET';
export const JUDGE_RESULT_CAP_ENV = 'KBN_EVALS_JUDGE_RESULT_CAP';

/**
 * Bytes of serialized tool-call history allowed into one judge request. The server cap covers the
 * whole body at 1679958 bytes; this leaves ~680KB of headroom for the system prompt (17KB), the
 * user prompt, the tool schema and the JSON envelope.
 */
export const DEFAULT_TRANSCRIPT_BYTE_BUDGET = 1_000_000;

/** Bytes of a single tool result kept before its tail is replaced by a marker. */
export const DEFAULT_RESULT_BYTE_CAP = 4_000;

/** Smallest a shortened value is allowed to become. */
const MIN_RESULT_BYTES = 200;

/** Bounded number of largest-value passes before falling back to dropping whole steps. */
const MAX_SHORTEN_PASSES = 25;

/** ASCII only, so the marker's own UTF-8 length equals its `length`. */
const MARKER_PREFIX = '...[+';
const MARKER_SUFFIX = ' chars]';

export interface BoundedTranscriptReport {
  /** False when the transcript already fit and was returned untouched. */
  bounded: boolean;
  originalBytes: number;
  boundedBytes: number;
  budgetBytes: number;
  /** Tool results whose tail was replaced by a marker. */
  shortenedValues: number;
  /** Steps dropped from the head of the transcript because the shortened steps still did not fit. */
  droppedSteps: number;
  /** True when the transcript could not be serialized at all (e.g. a circular reference). */
  unserializable: boolean;
}

export interface BoundedTranscript {
  json: string;
  report: BoundedTranscriptReport;
}

interface StringLeaf {
  path: Array<string | number>;
  value: string;
  bytes: number;
}

/** Exact UTF-8 length of a string, matching what the server measures on the wire. */
const utf8Length = (value: string): number => {
  let bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < value.length) {
      bytes += 4;
      i++;
    } else {
      bytes += 3;
    }
  }
  return bytes;
};

const safeStringify = (value: unknown): string | undefined => {
  try {
    return JSON.stringify(value) ?? undefined;
  } catch {
    return undefined;
  }
};

const parseEnvBytes = (name: string): number | undefined => {
  const raw = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  if (raw === undefined || raw === '') {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

/** `0` disables the bound (opt-out for runs that must stay byte-comparable with a baseline). */
const resolveByteBudget = (override?: number): number =>
  override ?? parseEnvBytes(JUDGE_TRANSCRIPT_BUDGET_ENV) ?? DEFAULT_TRANSCRIPT_BYTE_BUDGET;

const resolveResultCap = (override?: number): number =>
  override ?? parseEnvBytes(JUDGE_RESULT_CAP_ENV) ?? DEFAULT_RESULT_BYTE_CAP;

const shorten = (value: string, maxBytes: number): string => {
  // Slice on a code-unit boundary that keeps the result under `maxBytes`.
  let head = value;
  while (head.length > 0 && utf8Length(head) > maxBytes) {
    const overshoot = utf8Length(head) - maxBytes;
    head = head.slice(0, Math.max(0, head.length - overshoot));
  }
  const dropped = value.length - head.length;
  return `${head}${MARKER_PREFIX}${dropped}${MARKER_SUFFIX}`;
};

const collectStringLeaves = (
  value: unknown,
  path: Array<string | number> = [],
  out: StringLeaf[] = []
): StringLeaf[] => {
  if (typeof value === 'string') {
    out.push({ path, value, bytes: utf8Length(value) });
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStringLeaves(item, [...path, index], out));
    return out;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      collectStringLeaves((value as Record<string, unknown>)[key], [...path, key], out);
    }
  }
  return out;
};

const setByPath = (root: unknown, path: Array<string | number>, next: unknown): void => {
  let cursor = root as Record<string | number, unknown>;
  for (let i = 0; i < path.length - 1; i++) {
    cursor = cursor[path[i]] as Record<string | number, unknown>;
  }
  cursor[path[path.length - 1]] = next;
};

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const dropMarker = (droppedSteps: number) => ({
  type: 'transcript_bounded',
  dropped_steps: droppedSteps,
  note: 'Oldest steps omitted to keep the judge request inside the inference body cap. The final answer and the most recent tool calls are retained in full.',
});

/**
 * Serialize `steps` into a JSON string that fits `budgetBytes`, preserving JSON validity.
 *
 * Passes, in order:
 * 1. Cap every tool result over `perValueByteCap` (head kept, tail replaced by a marker).
 * 2. While still over budget, halve the largest remaining value (bounded number of passes).
 * 3. If still over, keep the most recent steps that fit and record the rest as dropped.
 *
 * The final string is always valid JSON and always at or under the budget (unless the caller
 * disabled the bound with `budgetBytes: 0`).
 */
export const boundToolCallHistory = (
  steps: unknown,
  options: { budgetBytes?: number; perValueByteCap?: number } = {}
): BoundedTranscript => {
  const budgetBytes = resolveByteBudget(options.budgetBytes);
  const perValueByteCap = resolveResultCap(options.perValueByteCap);
  const stepsArray = Array.isArray(steps) ? steps : [];

  const originalJson = safeStringify(stepsArray);
  if (originalJson === undefined) {
    return {
      json: '[]',
      report: {
        bounded: true,
        originalBytes: 0,
        boundedBytes: 2,
        budgetBytes,
        shortenedValues: 0,
        droppedSteps: 0,
        unserializable: true,
      },
    };
  }

  const originalBytes = utf8Length(originalJson);
  const unchanged: BoundedTranscript = {
    json: originalJson,
    report: {
      bounded: false,
      originalBytes,
      boundedBytes: originalBytes,
      budgetBytes,
      shortenedValues: 0,
      droppedSteps: 0,
      unserializable: false,
    },
  };

  if (budgetBytes <= 0 || perValueByteCap <= 0 || originalBytes <= budgetBytes) {
    return unchanged;
  }

  const bounded = deepClone(stepsArray);
  let shortenedValues = 0;

  for (const leaf of collectStringLeaves(bounded)) {
    if (leaf.bytes > perValueByteCap) {
      setByPath(bounded, leaf.path, shorten(leaf.value, perValueByteCap));
      shortenedValues++;
    }
  }

  let current = safeStringify(bounded) ?? '[]';
  for (let pass = 0; pass < MAX_SHORTEN_PASSES && utf8Length(current) > budgetBytes; pass++) {
    const largest = collectStringLeaves(bounded).sort((a, b) => b.bytes - a.bytes)[0];
    if (!largest || largest.bytes <= MIN_RESULT_BYTES) {
      break;
    }
    setByPath(
      bounded,
      largest.path,
      shorten(largest.value, Math.max(MIN_RESULT_BYTES, Math.floor(largest.bytes / 2)))
    );
    shortenedValues++;
    current = safeStringify(bounded) ?? '[]';
  }

  let droppedSteps = 0;
  if (utf8Length(current) > budgetBytes) {
    // Keep the most recent steps: the user query and the final answer are already in the prompt,
    // so the tail of the history carries the tool calls that support that answer.
    let low = 0;
    let high = bounded.length;
    while (low < high) {
      const keep = Math.ceil((low + high) / 2);
      const candidate = [
        dropMarker(bounded.length - keep),
        ...bounded.slice(bounded.length - keep),
      ];
      const size = utf8Length(safeStringify(candidate) ?? '[]');
      if (size <= budgetBytes) {
        low = keep;
      } else {
        high = keep - 1;
      }
    }
    droppedSteps = bounded.length - low;
    const kept = low > 0 ? [dropMarker(droppedSteps), ...bounded.slice(bounded.length - low)] : [];
    bounded.length = 0;
    bounded.push(...kept);
    current = safeStringify(bounded) ?? '[]';
  }

  const boundedBytes = utf8Length(current);
  return {
    json: current,
    report: {
      bounded: shortenedValues > 0 || droppedSteps > 0,
      originalBytes,
      boundedBytes,
      budgetBytes,
      shortenedValues,
      droppedSteps,
      unserializable: false,
    },
  };
};

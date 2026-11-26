/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timeoutSignal } from '@kbn/std';
import { createHash } from 'crypto';
import Fs from 'fs/promises';
import Os from 'os';
import Path from 'path';
import type { EvaluationDataset, Example } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ARM_ID,
  DATASET_NAME,
  INDEX_SCHEMA_VERSION,
  LONGMEMEVAL_EXAMPLE_COUNT,
  LONGMEMEVAL_REFERENCE_JUDGE_REVISION,
  LONGMEMEVAL_SOURCE_BYTES,
  LONGMEMEVAL_SOURCE_REVISION,
  LONGMEMEVAL_SOURCE_SHA256,
  LONGMEMEVAL_SOURCE_URL,
  LONGMEMEVAL_SPLIT_REVISION,
  PROMPT_VERSION,
  SELECTED_EXAMPLE_SPLIT,
  SUITE_VERSION,
} from './constants';

export const LONGMEMEVAL_QUESTION_TYPES = [
  'single-session-user',
  'single-session-assistant',
  'single-session-preference',
  'multi-session',
  'temporal-reasoning',
  'knowledge-update',
] as const;
export type LongMemEvalQuestionType = (typeof LONGMEMEVAL_QUESTION_TYPES)[number];

export interface LongMemEvalMessage {
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

/** Target-facing history. It structurally cannot carry question, answer or evidence labels. */
export interface LongMemEvalHistorySession {
  readonly sourceIndex: number;
  readonly sessionId: string;
  readonly occurredAtRaw: string;
  readonly occurredAt: string;
  readonly messages: readonly LongMemEvalMessage[];
}

export interface LongMemEvalHistory {
  readonly sessions: readonly LongMemEvalHistorySession[];
}

export interface LongMemEvalInput extends Record<string, unknown> {
  question: string;
  /** Raw upstream value; rendered verbatim as `Current Date: ...`. */
  questionDate: string;
}

export interface LongMemEvalExpected {
  expected: string;
}

export interface LongMemEvalMetadata extends Record<string, unknown> {
  externalId: string;
  questionType: LongMemEvalQuestionType;
  abstention: boolean;
  split: string;
  /** Opaque IDs of the evidence sessions; evaluator-side only, never shown to the agent. */
  evidenceSessionIds: string[];
  sessionCount: number;
  sourceRevision: string;
  sourceSha256: string;
  splitRevision: string;
  referenceJudgeRevision: string;
  indexSchemaVersion: string;
  promptVersion: string;
  armId: string;
  suiteVersion: string;
}

export type LongMemEvalExample = Example<
  LongMemEvalInput,
  LongMemEvalExpected,
  LongMemEvalMetadata
> & {
  id: string;
  input: LongMemEvalInput;
  output: LongMemEvalExpected;
  metadata: LongMemEvalMetadata;
};

export interface LongMemEvalSuiteData {
  readonly dataset: EvaluationDataset<LongMemEvalExample>;
  /** Keyed by example id. */
  readonly histories: ReadonlyMap<string, LongMemEvalHistory>;
}

interface SourceRecord {
  readonly questionId: string;
  readonly questionType: LongMemEvalQuestionType;
  readonly question: string;
  readonly questionDate: string;
  readonly answer: string;
  readonly answerSessionIds: readonly string[];
  readonly haystackSessionIds: readonly string[];
  readonly haystackDates: readonly unknown[];
  readonly haystackSessions: readonly unknown[];
}

const TIMESTAMP_PATTERN =
  /^(\d{4})\/(\d{2})\/(\d{2}) \((Mon|Tue|Wed|Thu|Fri|Sat|Sun)\) (\d{2}):(\d{2})$/;

const HISTORY_FORBIDDEN_KEYS = new Set([
  'answer',
  'answer_session_ids',
  'evidence_session_ids',
  'expected_output',
  'has_answer',
  'question_id',
  'question',
  'question_type',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isQuestionType = (value: unknown): value is LongMemEvalQuestionType =>
  typeof value === 'string' && (LONGMEMEVAL_QUESTION_TYPES as readonly string[]).includes(value);

/**
 * Parses an upstream timezone-free timestamp (`2023/05/30 (Tue) 20:36`) into
 * `YYYY-MM-DDTHH:MM` without inventing a timezone or using host-local parsing.
 */
export const parseLongMemEvalTimestamp = (
  value: unknown,
  { field, questionId }: { field: string; questionId: string }
): string => {
  if (typeof value !== 'string') {
    throw new Error(`${questionId}: ${field} must be a string.`);
  }
  const match = TIMESTAMP_PATTERN.exec(value);
  if (!match) {
    throw new Error(`${questionId}: ${field} has unsupported timestamp ${JSON.stringify(value)}.`);
  }
  const [, year, month, day, , hour, minute] = match;
  const asDate = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))
  );
  const isRealDate =
    asDate.getUTCFullYear() === Number(year) &&
    asDate.getUTCMonth() === Number(month) - 1 &&
    asDate.getUTCDate() === Number(day) &&
    asDate.getUTCHours() === Number(hour) &&
    asDate.getUTCMinutes() === Number(minute);
  if (!isRealDate) {
    throw new Error(`${questionId}: ${field} is not a real date ${JSON.stringify(value)}.`);
  }
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

export const opaqueSessionId = (sessionIndex: number): string =>
  `session-${String(sessionIndex).padStart(4, '0')}`;

/** Throws if any benchmark label key appears anywhere in a target-facing value. */
export const assertNoGoldFields = (value: unknown, path = 'history'): void => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoGoldFields(item, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  const leaked = Object.keys(value).filter((key) => HISTORY_FORBIDDEN_KEYS.has(key));
  if (leaked.length > 0) {
    throw new Error(
      `Gold field(s) leaked into target-facing ${path}: ${leaked.sort().join(', ')}.`
    );
  }
  for (const [key, nested] of Object.entries(value)) {
    assertNoGoldFields(nested, `${path}.${key}`);
  }
};

const validateMessages = (
  value: unknown,
  { questionId, sessionIndex }: { questionId: string; sessionIndex: number }
): LongMemEvalMessage[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${questionId}: session ${sessionIndex} must be a non-empty message list.`);
  }
  return value.map((message, messageIndex) => {
    const location = `${questionId}: message ${sessionIndex}:${messageIndex}`;
    if (!isRecord(message)) {
      throw new Error(`${location} must be an object.`);
    }
    // `has_answer` is an upstream gold label: accepted only so it can be dropped.
    const unsupported = Object.keys(message).filter(
      (key) => key !== 'role' && key !== 'content' && key !== 'has_answer'
    );
    if (unsupported.length > 0) {
      throw new Error(`${location} has unsupported fields: ${unsupported.sort().join(', ')}.`);
    }
    const { role, content } = message;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') {
      throw new Error(`${location} must have a user/assistant role and string content.`);
    }
    return { role, content };
  });
};

/** Validates the full upstream source, mirroring Orca #94 `_validate_source_records`. */
export const validateSourceRecords = (
  value: unknown,
  expectedCount: number = LONGMEMEVAL_EXAMPLE_COUNT
): SourceRecord[] => {
  if (!Array.isArray(value)) {
    throw new Error('LongMemEval-S source must be a top-level JSON array.');
  }
  if (value.length !== expectedCount) {
    throw new Error(
      `LongMemEval-S source must contain ${expectedCount} examples; found ${value.length}.`
    );
  }

  const seen = new Set<string>();
  return value.map((record, sourceIndex) => {
    if (!isRecord(record)) {
      throw new Error(`Source row ${sourceIndex} must be an object.`);
    }
    const {
      question_id: questionId,
      question_type: questionType,
      question,
      question_date: questionDate,
      answer,
      answer_session_ids: answerSessionIds,
      haystack_session_ids: haystackSessionIds,
      haystack_dates: haystackDates,
      haystack_sessions: haystackSessions,
    } = record;

    if (typeof questionId !== 'string' || questionId.length === 0) {
      throw new Error(`Source row ${sourceIndex} has no valid question_id.`);
    }
    if (seen.has(questionId)) {
      throw new Error(`Duplicate question_id: ${questionId}.`);
    }
    seen.add(questionId);

    if (!isQuestionType(questionType)) {
      throw new Error(`${questionId}: unsupported question_type ${JSON.stringify(questionType)}.`);
    }
    if (typeof question !== 'string' || typeof questionDate !== 'string') {
      throw new Error(`${questionId}: question and question_date must be strings.`);
    }
    if (typeof answer !== 'string' && !(typeof answer === 'number' && Number.isInteger(answer))) {
      throw new Error(`${questionId}: answer must be a string or integer.`);
    }
    if (!isStringArray(answerSessionIds)) {
      throw new Error(`${questionId}: answer_session_ids must be strings.`);
    }
    if (!isStringArray(haystackSessionIds)) {
      throw new Error(`${questionId}: haystack_session_ids must be strings.`);
    }
    if (!Array.isArray(haystackDates) || !Array.isArray(haystackSessions)) {
      throw new Error(`${questionId}: haystack fields must be lists.`);
    }
    if (
      haystackSessionIds.length !== haystackDates.length ||
      haystackSessionIds.length !== haystackSessions.length
    ) {
      throw new Error(`${questionId}: haystack parallel arrays differ in length.`);
    }
    const unknownEvidence = answerSessionIds.filter((id) => !haystackSessionIds.includes(id));
    if (unknownEvidence.length > 0) {
      throw new Error(`${questionId}: evidence session IDs are absent from history.`);
    }
    const ambiguousEvidence = answerSessionIds.filter(
      (id) => haystackSessionIds.filter((candidate) => candidate === id).length > 1
    );
    if (ambiguousEvidence.length > 0) {
      throw new Error(`${questionId}: evidence session IDs must identify exactly one occurrence.`);
    }

    return {
      questionId,
      questionType,
      question,
      questionDate,
      answer: String(answer),
      answerSessionIds,
      haystackSessionIds,
      haystackDates,
      haystackSessions,
    };
  });
};

/** Builds the target-facing history, mirroring Orca #94 `_normalize_history`. */
export const normalizeHistory = (record: SourceRecord): LongMemEvalHistory => {
  const { questionId, haystackSessionIds, haystackDates, haystackSessions } = record;
  const sessions = haystackSessionIds.map((sessionId, sessionIndex) => {
    if (sessionId.length === 0) {
      throw new Error(`${questionId}: session ${sessionIndex} has no valid session ID.`);
    }
    const occurredAtRaw = haystackDates[sessionIndex];
    return {
      sourceIndex: sessionIndex,
      // Source IDs reveal evidence: every upstream `answer_*` ID is a gold session.
      sessionId: opaqueSessionId(sessionIndex),
      occurredAtRaw: String(occurredAtRaw),
      occurredAt: parseLongMemEvalTimestamp(occurredAtRaw, {
        field: `haystack_dates[${sessionIndex}]`,
        questionId,
      }),
      messages: validateMessages(haystackSessions[sessionIndex], { questionId, sessionIndex }),
    };
  });
  const history: LongMemEvalHistory = { sessions };
  assertNoGoldFields(history);
  return history;
};

const opaqueEvidenceSessionIds = ({ haystackSessionIds, answerSessionIds }: SourceRecord) =>
  haystackSessionIds.flatMap((sourceId, index) =>
    answerSessionIds.includes(sourceId) ? [opaqueSessionId(index)] : []
  );

/** Selects the frozen IDs and splits each into an evaluator-facing example and a history. */
export const buildSuiteData = (
  records: readonly SourceRecord[],
  selectedIds: readonly string[]
): LongMemEvalSuiteData => {
  const byId = new Map(records.map((record) => [record.questionId, record]));
  const missing = selectedIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new Error(`Selected LongMemEval IDs not found in source: ${missing.join(', ')}.`);
  }

  const histories = new Map<string, LongMemEvalHistory>();
  const examples = selectedIds.map((id): LongMemEvalExample => {
    const record = byId.get(id);
    if (!record) {
      throw new Error(`Selected LongMemEval ID not found in source: ${id}.`);
    }
    parseLongMemEvalTimestamp(record.questionDate, { field: 'question_date', questionId: id });
    const history = normalizeHistory(record);
    histories.set(id, history);
    return {
      id,
      input: { question: record.question, questionDate: record.questionDate },
      output: { expected: record.answer },
      metadata: {
        externalId: id,
        questionType: record.questionType,
        abstention: id.endsWith('_abs'),
        split: SELECTED_EXAMPLE_SPLIT,
        evidenceSessionIds: opaqueEvidenceSessionIds(record),
        sessionCount: history.sessions.length,
        sourceRevision: LONGMEMEVAL_SOURCE_REVISION,
        sourceSha256: LONGMEMEVAL_SOURCE_SHA256,
        splitRevision: LONGMEMEVAL_SPLIT_REVISION,
        referenceJudgeRevision: LONGMEMEVAL_REFERENCE_JUDGE_REVISION,
        indexSchemaVersion: INDEX_SCHEMA_VERSION,
        promptVersion: PROMPT_VERSION,
        armId: ARM_ID,
        suiteVersion: SUITE_VERSION,
      },
    };
  });

  return {
    dataset: {
      name: DATASET_NAME,
      description:
        'LongMemEval-S (pinned revision) direct-index plumbing POC: full histories indexed one session per document, answered by the default Agent Builder agent. Not comparable with published LongMemEval results.',
      tags: ['context-engine', 'memory', 'longmemeval'],
      examples,
    },
    histories,
  };
};

export const sha256Hex = (buffer: Buffer): string =>
  createHash('sha256').update(buffer).digest('hex');

/** Throws unless the buffer is exactly the pinned upstream file. */
export const verifySourceBuffer = (buffer: Buffer): void => {
  if (buffer.length !== LONGMEMEVAL_SOURCE_BYTES) {
    throw new Error(
      `LongMemEval-S size mismatch: expected ${LONGMEMEVAL_SOURCE_BYTES} bytes, got ${buffer.length}.`
    );
  }
  const actual = sha256Hex(buffer);
  if (actual !== LONGMEMEVAL_SOURCE_SHA256) {
    throw new Error(
      `LongMemEval-S checksum mismatch: expected ${LONGMEMEVAL_SOURCE_SHA256}, got ${actual}.`
    );
  }
};

export class DatasetDownloadFailedError extends Error {
  readonly code = 'dataset_download_failed';
}

const DOWNLOAD_ATTEMPTS = 3;
// A stalled connection must fail and retry rather than hang until the test timeout.
const DOWNLOAD_TIMEOUT_MS = 5 * 60_000;
const CACHE_PATH = Path.join(
  Os.tmpdir(),
  'kbn-evals-longmemeval',
  `${LONGMEMEVAL_SOURCE_SHA256}.json`
);

const readVerified = async (path: string): Promise<Buffer | undefined> => {
  try {
    const buffer = await Fs.readFile(path);
    verifySourceBuffer(buffer);
    return buffer;
  } catch {
    return undefined;
  }
};

const download = async (log: ToolingLog): Promise<Buffer> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS; attempt++) {
    try {
      log.info(`Downloading LongMemEval-S (attempt ${attempt}/${DOWNLOAD_ATTEMPTS})`);
      const deadline = timeoutSignal(DOWNLOAD_TIMEOUT_MS);
      try {
        const response = await fetch(LONGMEMEVAL_SOURCE_URL, {
          signal: deadline,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        verifySourceBuffer(buffer);
        return buffer;
      } finally {
        deadline.dispose();
      }
    } catch (error) {
      lastError = error;
      log.warning(`LongMemEval-S download attempt ${attempt} failed: ${String(error)}`);
      if (attempt < DOWNLOAD_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 5_000));
      }
    }
  }
  throw new DatasetDownloadFailedError(
    `dataset_download_failed: could not download ${LONGMEMEVAL_SOURCE_URL}: ${String(lastError)}`
  );
};

/**
 * Returns the pinned source file, from `LONGMEMEVAL_S_PATH`, the local cache, or a fresh
 * download, verifying size and checksum before anything is parsed.
 */
export const loadVerifiedSource = async (log: ToolingLog): Promise<Buffer> => {
  const overridePath = process.env.LONGMEMEVAL_S_PATH;
  if (overridePath) {
    const buffer = await Fs.readFile(overridePath);
    verifySourceBuffer(buffer);
    log.info(`Using LongMemEval-S from LONGMEMEVAL_S_PATH (${overridePath})`);
    return buffer;
  }

  const cached = await readVerified(CACHE_PATH);
  if (cached) {
    log.info(`Using cached LongMemEval-S (${CACHE_PATH})`);
    return cached;
  }

  const buffer = await download(log);
  await Fs.mkdir(Path.dirname(CACHE_PATH), { recursive: true, mode: 0o700 });
  const tempPath = `${CACHE_PATH}.${process.pid}.tmp`;
  await Fs.writeFile(tempPath, buffer);
  await Fs.rename(tempPath, CACHE_PATH);
  return buffer;
};

/** Parses `LONGMEMEVAL_IDS` (comma-separated) for local single-example runs. */
export const resolveSelectedIds = (
  allIds: readonly string[],
  envValue: string | undefined = process.env.LONGMEMEVAL_IDS
): string[] => {
  if (!envValue) {
    return [...allIds];
  }
  const requested = envValue
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  const unknown = requested.filter((id) => !allIds.includes(id));
  if (unknown.length > 0) {
    throw new Error(`LONGMEMEVAL_IDS contains IDs outside the frozen set: ${unknown.join(', ')}.`);
  }
  return requested;
};

/** Loads, verifies, validates and splits the pinned source for the given IDs. */
export const loadLongMemEvalSuiteData = async ({
  log,
  selectedIds,
}: {
  log: ToolingLog;
  selectedIds: readonly string[];
}): Promise<LongMemEvalSuiteData> => {
  const buffer = await loadVerifiedSource(log);
  const records = validateSourceRecords(JSON.parse(buffer.toString('utf8')));
  return buildSuiteData(records, selectedIds);
};

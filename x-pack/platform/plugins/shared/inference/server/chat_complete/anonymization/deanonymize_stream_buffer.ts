/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Anonymization } from '@kbn/inference-common';
import { indexEntitiesByMask, replaceMasks } from './deanonymize';

// Minimum tail length before we consider it a potential split mask. This must be 1, not
// higher: if a mask's very first character (e.g. 'E' for an EMAIL_... mask) is ever
// flushed in isolation, the buffer permanently loses alignment with that mask's start —
// every later character is then checked as a suffix of a *new* accumulation that can
// never match a prefix anchored at the mask's true beginning, so the raw mask leaks
// through unresolved for the rest of the stream. Holding a lone leading character costs
// at most one extra chunk of latency on an ordinary word that happens to start with the
// same letter as a known mask (resolved as soon as the next chunk confirms or refutes
// the match); losing alignment costs a visibly wrong, permanently un-deanonymized value.
const MIN_HOLDBACK_LENGTH = 1;

interface MaskPrefixIndex {
  /** Every proper prefix (length >= MIN_HOLDBACK_LENGTH, strictly shorter than the mask itself) of every known mask for this call. */
  prefixes: ReadonlySet<string>;
  /** First character of every known mask; a held suffix or a mask occurrence can only begin at one of these. */
  firstChars: ReadonlySet<string>;
  /** Longest prefix in `prefixes`, i.e. the most this buffer could ever hold at once. */
  maxLength: number;
}

/**
 * Indexes every proper prefix of every known mask for this call, so that streamed
 * content can be checked against exactly the masks that can actually appear in this
 * response — rather than a generic "looks token-shaped" heuristic, which would also
 * match ordinary capitalized words/acronyms and cause needless streaming gaps.
 */
function buildMaskPrefixIndex(masks: Iterable<string>): MaskPrefixIndex {
  const prefixes = new Set<string>();
  const firstChars = new Set<string>();
  let maxLength = 0;

  for (const mask of masks) {
    if (mask.length === 0) {
      continue;
    }
    firstChars.add(mask[0]);
    for (let length = MIN_HOLDBACK_LENGTH; length < mask.length; length += 1) {
      prefixes.add(mask.slice(0, length));
      maxLength = Math.max(maxLength, length);
    }
  }

  return { prefixes, firstChars, maxLength };
}

/**
 * Length of the longest suffix of `value` that is a known proper mask prefix, or 0 if
 * none matches. Only positions holding a mask's first character are sliced/looked up,
 * so the common case (no candidate start in the tail) allocates nothing.
 */
function longestHeldSuffixLength(
  value: string,
  { prefixes, firstChars, maxLength }: MaskPrefixIndex
): number {
  const earliestStart = Math.max(0, value.length - maxLength);
  for (let start = earliestStart; start <= value.length - MIN_HOLDBACK_LENGTH; start += 1) {
    if (firstChars.has(value[start]) && prefixes.has(value.slice(start))) {
      return value.length - start;
    }
  }
  return 0;
}

/** Whether `value` contains any character a mask could start with. */
function mayContainMask(value: string, firstChars: ReadonlySet<string>): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (firstChars.has(value[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Incrementally deanonymizes streamed content so that already-restored PII can
 * be emitted to the client chunk-by-chunk, instead of only once the full message
 * is known.
 *
 * Each call to `push` accumulates the new content into a small held buffer, then
 * releases everything except a trailing run that exactly matches a proper prefix of
 * one of this call's known masks (i.e. could still turn out to be part of an
 * incomplete mask). Because the check is against the exact, closed set of masks
 * issued for this call — the model can only ever echo back masks it was given, never
 * invent new ones — this only ever holds back ordinary text that happens to share a
 * leading character with a real mask (for at most one extra chunk, until the next
 * chunk confirms or refutes the match), and the held tail is naturally bounded by the
 * longest known mask, with no artificial cap needed. Use `emittedLength` once the
 * full, authoritative deanonymized content is known to compute the final catch-up
 * delta still owed to the client.
 */
export class DeanonymizeStreamBuffer {
  private held = '';
  private _emittedLength = 0;
  private readonly entitiesByMask: ReadonlyMap<string, Anonymization['entity']>;
  private readonly prefixIndex: MaskPrefixIndex;

  constructor(anonymizations: Anonymization[]) {
    this.entitiesByMask = indexEntitiesByMask(anonymizations);
    this.prefixIndex = buildMaskPrefixIndex(this.entitiesByMask.keys());
  }

  /** Total number of deanonymized characters emitted via `push` so far. */
  public get emittedLength(): number {
    return this._emittedLength;
  }

  /** Feed the next raw content delta; returns the safe-to-emit deanonymized delta (possibly empty). */
  public push(contentDelta: string): string {
    if (!contentDelta) {
      return '';
    }

    this.held += contentDelta;

    const heldLength = longestHeldSuffixLength(this.held, this.prefixIndex);
    const safeLength = this.held.length - heldLength;

    const safePrefix = this.held.slice(0, safeLength);
    this.held = this.held.slice(safeLength);

    if (!safePrefix) {
      return '';
    }

    // No character that could start a mask: nothing to replace, skip the per-mask scan.
    if (!mayContainMask(safePrefix, this.prefixIndex.firstChars)) {
      this._emittedLength += safePrefix.length;
      return safePrefix;
    }

    const { output } = replaceMasks(safePrefix, this.entitiesByMask);
    this._emittedLength += output.length;
    return output;
  }
}

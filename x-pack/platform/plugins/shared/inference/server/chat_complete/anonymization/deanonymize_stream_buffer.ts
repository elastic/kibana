/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Anonymization } from '@kbn/inference-common';
import { indexEntitiesByMask, replaceMasks } from './deanonymize';

interface MaskIndex {
  /** Every known mask for this call. */
  masks: readonly string[];
  /** First character of every known mask; a held tail can only begin at one of these. */
  firstChars: ReadonlySet<string>;
  /** Longest tail that could still be an incomplete mask, i.e. the longest mask minus one. */
  maxHeldLength: number;
}

/**
 * Indexes the exact masks known for this call, so that streamed content can be checked
 * against the masks that can actually appear in this response — rather than a generic
 * "looks token-shaped" heuristic, which would also match ordinary capitalized words/acronyms
 * and cause needless streaming gaps.
 */
function buildMaskIndex(maskList: Iterable<string>): MaskIndex {
  const masks = [...maskList].filter((mask) => mask.length > 0);
  return {
    masks,
    firstChars: new Set(masks.map((mask) => mask[0])),
    maxHeldLength: masks.reduce((max, mask) => Math.max(max, mask.length - 1), 0),
  };
}

/**
 * Whether `position` lies strictly inside a complete occurrence of a known mask in `value`.
 * A suffix that starts inside a finished mask is part of that mask, not the start of a new one.
 */
function isInsideCompleteMask(value: string, position: number, masks: readonly string[]): boolean {
  return masks.some((mask) => {
    for (let start = Math.max(0, position - mask.length + 1); start < position; start += 1) {
      if (value.startsWith(mask, start)) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Length of the longest suffix of `value` that is a proper prefix of a known mask (i.e. could
 * still turn out to be part of an incomplete mask), or 0 if none matches. Only tail positions
 * holding a mask's first character are compared, so the common case allocates nothing.
 */
function longestHeldSuffixLength(
  value: string,
  { masks, firstChars, maxHeldLength }: MaskIndex
): number {
  // Every tail position is a candidate, including a lone trailing character: if a mask's first
  // character were flushed on its own, the buffer would lose alignment with that mask and the
  // raw mask would leak for the rest of the stream. Holding an ordinary word that shares a first
  // character with a mask only costs one extra chunk of latency.
  const earliestStart = Math.max(0, value.length - maxHeldLength);
  for (let start = earliestStart; start < value.length; start += 1) {
    if (!firstChars.has(value[start])) {
      continue;
    }
    const tail = value.slice(start);
    const couldBeIncompleteMask = masks.some(
      (mask) => mask.length > tail.length && mask.startsWith(tail)
    );
    // Masks embed user-configurable entity classes and a hex hash, so the end of a finished
    // mask can coincide with the start of another one (e.g. `email_…e`). Holding that would
    // split the finished mask and leak its raw prefix.
    if (couldBeIncompleteMask && !isInsideCompleteMask(value, start, masks)) {
      return tail.length;
    }
  }
  return 0;
}

/** Length of the longest shared prefix of `a` and `b`. */
function commonPrefixLength(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let length = 0;
  while (length < max && a[length] === b[length]) {
    length += 1;
  }
  return length;
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
 * longest known mask, with no artificial cap needed.
 *
 * Once the full, authoritative deanonymized content is known, `catchUp` returns the
 * remainder still owed to the client. It relies on the streamed text being a prefix of
 * that content and reports when it is not.
 */
export class DeanonymizeStreamBuffer {
  private held = '';
  private emitted = '';
  private readonly entitiesByMask: ReadonlyMap<string, Anonymization['entity']>;
  private readonly maskIndex: MaskIndex;

  constructor(anonymizations: Anonymization[]) {
    this.entitiesByMask = indexEntitiesByMask(anonymizations);
    this.maskIndex = buildMaskIndex(this.entitiesByMask.keys());
  }

  /** Feed the next raw content delta; returns the safe-to-emit deanonymized delta (possibly empty). */
  public push(contentDelta: string): string {
    if (!contentDelta) {
      return '';
    }

    this.held += contentDelta;

    const heldLength = longestHeldSuffixLength(this.held, this.maskIndex);
    const safeLength = this.held.length - heldLength;

    const safePrefix = this.held.slice(0, safeLength);
    this.held = this.held.slice(safeLength);

    if (!safePrefix) {
      return '';
    }

    const { output } = replaceMasks(safePrefix, this.entitiesByMask);
    this.emitted += output;
    return output;
  }

  /**
   * Given the authoritative full deanonymized text, returns what has not been emitted yet. If
   * the text already streamed is not a prefix of `fullText`, the two passes disagreed:
   * `diverged` is true and `content` is the part of `fullText` after their common prefix.
   */
  public catchUp(fullText: string): { content: string; diverged: boolean } {
    if (fullText.startsWith(this.emitted)) {
      return { content: fullText.slice(this.emitted.length), diverged: false };
    }
    return {
      content: fullText.slice(commonPrefixLength(fullText, this.emitted)),
      diverged: true,
    };
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The parts of a proposal beyond what to do: how to do it, why, and what backs it. A proposal's `comment` is the "what to
 * do"; this travels at the end of it as a Markdown link reference definition, which no Markdown
 * renderer draws, so a surface that knows nothing of it shows the "what" alone.
 */
export interface ProposalWhy {
  /** How to do it, in Markdown: where it applies, who should do it if known, and any code. */
  how?: string;
  /** Why this action, in one sentence: the nutshell the reader sees before the details. */
  explanation?: string;
  /** Ids of the impact map events that support it. */
  event_ids?: string[];
  /** Names of the hypotheses, confirmed or leading, that led to it. */
  hypotheses?: string[];
  /** The title of the blind spot this action is meant to close, when it is. */
  blind_spot?: string;
}

const WHY_DEFINITION = /^\[nightshift-why\]:\s*#(\S+)\s*$/m;

/** The comment as stored: the "what", then the "why" when there is one. */
export const buildProposalComment = (what: string, why?: ProposalWhy): string => {
  const kept: ProposalWhy = {
    ...(why?.how?.trim() ? { how: why.how.trim() } : {}),
    ...(why?.explanation?.trim() ? { explanation: why.explanation.trim() } : {}),
    ...(why?.event_ids?.length ? { event_ids: why.event_ids } : {}),
    ...(why?.hypotheses?.length ? { hypotheses: why.hypotheses } : {}),
    ...(why?.blind_spot?.trim() ? { blind_spot: why.blind_spot.trim() } : {}),
  };
  return Object.keys(kept).length
    ? `${what.trimEnd()}\n\n[nightshift-why]: #${encodeURIComponent(JSON.stringify(kept))}`
    : what;
};

/** Splits a stored comment into the "what" and the "why". A comment with no "why" is all "what". */
export const parseProposalComment = (comment: string): { what: string; why?: ProposalWhy } => {
  const match = WHY_DEFINITION.exec(comment);
  if (!match) {
    return { what: comment };
  }
  const what = comment.replace(WHY_DEFINITION, '').trimEnd();
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(match[1]));
    if (parsed && typeof parsed === 'object') {
      return { what, why: parsed as ProposalWhy };
    }
  } catch {
    // A mangled reference is dropped: the "what" stands on its own.
  }
  return { what };
};

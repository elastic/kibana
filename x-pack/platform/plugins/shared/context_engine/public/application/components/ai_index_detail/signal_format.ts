/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Signal } from '../../../../common/http_api/signals';

/** The `data.status` value marking a failed tool call. Shared by the row and the detail flyout. */
export const SIGNAL_STATUS_ERROR = 'Error';

/** Known tags get a curated label; unknown tags fall back to a Title-Cased keyword. */
const KNOWN_TAG_LABELS: Record<string, string> = {
  query_error: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.tag.queryError', {
    defaultMessage: 'Query error',
  }),
  empty_retrieval: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.tag.emptyRetrieval', {
    defaultMessage: 'Empty retrieval',
  }),
  coverage_gap: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.tag.coverageGap', {
    defaultMessage: 'Coverage gap',
  }),
};

/** Turns a snake_case keyword into a human-readable label, using curated labels where available. */
export const humanizeTagType = (tag: string): string => {
  const known = KNOWN_TAG_LABELS[tag];
  if (known) {
    return known;
  }
  if (!tag) {
    return i18n.translate('xpack.contextEngine.aiIndexDetail.signals.tag.untagged', {
      defaultMessage: 'Signal',
    });
  }
  return tag
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/** A one-line, human explanation of what a tag/group means, shown on the group row and flyout. */
const KNOWN_TAG_DESCRIPTIONS: Record<string, string> = {
  query_error: i18n.translate(
    'xpack.contextEngine.aiIndexDetail.signals.tagDescription.queryError',
    {
      defaultMessage: 'The agent’s ES|QL tool call failed against the target index.',
    }
  ),
  empty_retrieval: i18n.translate(
    'xpack.contextEngine.aiIndexDetail.signals.tagDescription.emptyRetrieval',
    { defaultMessage: 'A query ran successfully but returned no rows.' }
  ),
  coverage_gap: i18n.translate(
    'xpack.contextEngine.aiIndexDetail.signals.tagDescription.coverageGap',
    { defaultMessage: 'The agent used raw index access instead of a knowledge indicator.' }
  ),
};

/** Explains a tag group in one sentence; falls back to a generic description for unknown tags. */
export const tagDescription = (tag: string): string =>
  KNOWN_TAG_DESCRIPTIONS[tag] ??
  i18n.translate('xpack.contextEngine.aiIndexDetail.signals.tagDescription.fallback', {
    defaultMessage: 'Signals classified as “{label}”.',
    values: { label: humanizeTagType(tag) },
  });

const NO_TARGET = i18n.translate('xpack.contextEngine.aiIndexDetail.signals.noTarget', {
  defaultMessage: 'unknown target',
});

/** The target index a signal is about, with a fallback so it is never blank. */
export const signalTarget = (signal: Signal): string => signal.data.target_index || NO_TARGET;

/** Picks the primary tag used to title a signal (its first tag), falling back to the signal type. */
const primaryTag = (signal: Signal): string => signal.tags[0] ?? signal.signal_type;

/** `{Type} · {target}` — e.g. `Query error · ai-index-ds-support`. */
export const signalTitle = (signal: Signal): string =>
  `${humanizeTagType(primaryTag(signal))} · ${signalTarget(signal)}`;

const QUERY_KIND_LABELS: Record<Signal['data']['query_kind'], string> = {
  ki_retrieval: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.queryKind.kiRetrieval', {
    defaultMessage: 'Knowledge Indicator retrieval',
  }),
  raw_access: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.queryKind.rawAccess', {
    defaultMessage: 'raw index access',
  }),
  other: i18n.translate('xpack.contextEngine.aiIndexDetail.signals.queryKind.other', {
    defaultMessage: 'other access',
  }),
};

/** Human-readable label for a `query_kind`. */
export const humanizeQueryKind = (queryKind: Signal['data']['query_kind']): string =>
  QUERY_KIND_LABELS[queryKind] ?? QUERY_KIND_LABELS.other;

/**
 * A one/two-sentence, client-side summary derived from the signal's tags and `data`. There is
 * always a fallback so the summary is never blank.
 */
export const signalSummary = (signal: Signal): string => {
  const { data } = signal;
  const target = signalTarget(signal);
  const kind = humanizeQueryKind(data.query_kind);

  const sentences: string[] = [];

  if (signal.tags.includes('query_error') || data.status === SIGNAL_STATUS_ERROR) {
    sentences.push(
      i18n.translate('xpack.contextEngine.aiIndexDetail.signals.summary.queryError', {
        defaultMessage: 'A {kind} tool call against {target} failed{error}.',
        values: {
          kind,
          target,
          error: data.error ? `: ${data.error}` : '',
        },
      })
    );
  } else if (signal.tags.includes('empty_retrieval') || data.returned.row_count === 0) {
    sentences.push(
      i18n.translate('xpack.contextEngine.aiIndexDetail.signals.summary.emptyRetrieval', {
        defaultMessage: 'A {kind} tool call against {target} returned no rows.',
        values: { kind, target },
      })
    );
  } else if (signal.tags.includes('coverage_gap')) {
    sentences.push(
      i18n.translate('xpack.contextEngine.aiIndexDetail.signals.summary.coverageGap', {
        defaultMessage: 'A coverage gap was detected while accessing {target} via {kind}.',
        values: { kind, target },
      })
    );
  }

  if (data.fell_back_to_raw) {
    sentences.push(
      i18n.translate('xpack.contextEngine.aiIndexDetail.signals.summary.fellBackToRaw', {
        defaultMessage: 'The agent fell back to raw index access.',
      })
    );
  }

  if (sentences.length === 0) {
    // Fallback so the summary is never blank.
    sentences.push(
      i18n.translate('xpack.contextEngine.aiIndexDetail.signals.summary.fallback', {
        defaultMessage:
          'A {kind} tool call against {target} returned {rowCount, plural, one {# row} other {# rows}}.',
        values: { kind, target, rowCount: data.returned.row_count },
      })
    );
  }

  return sentences.join(' ');
};

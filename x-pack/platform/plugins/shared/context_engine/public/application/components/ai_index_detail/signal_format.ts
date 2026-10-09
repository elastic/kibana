/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Signal, SignalTag } from '../../../../common/http_api/signals';

/** The `data.status` value marking a failed tool call. Shared by the row and the detail flyout. */
export const SIGNAL_STATUS_ERROR = 'Error';

const TAG_LABELS: Record<SignalTag, string> = {
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

/** Human-readable label for a classification tag. */
export const tagLabel = (tag: SignalTag): string => TAG_LABELS[tag];

/** A one-line, human explanation of what a tag/group means, shown on the group row and flyout. */
const TAG_DESCRIPTIONS: Record<SignalTag, string> = {
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

/** Explains a tag group in one sentence. */
export const tagDescription = (tag: SignalTag): string => TAG_DESCRIPTIONS[tag];

const NO_TARGET = i18n.translate('xpack.contextEngine.aiIndexDetail.signals.noTarget', {
  defaultMessage: 'unknown target',
});

/** The target index a signal is about, with a fallback so it is never blank. */
export const signalTarget = (signal: Signal): string => signal.data.target_index || NO_TARGET;

const UNTAGGED_LABEL = i18n.translate('xpack.contextEngine.aiIndexDetail.signals.tag.untagged', {
  defaultMessage: 'Signal',
});

/** `{Type} · {target}` — e.g. `Query error · ai-index-ds-support`. A clean signal carries no tag. */
export const signalTitle = (signal: Signal): string => {
  const [tag] = signal.tags;
  return `${tag ? tagLabel(tag) : UNTAGGED_LABEL} · ${signalTarget(signal)}`;
};

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
  QUERY_KIND_LABELS[queryKind];

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

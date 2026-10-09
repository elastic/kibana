/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NoData, Query, Recovery } from '@kbn/alerting-v2-schemas';
import {
  getBreachEsqlQuery,
  getNoDataEsqlQuery,
  getRecoverEsqlQuery,
  getRootEsqlQuery,
  recoveryStrategy,
} from '@kbn/alerting-v2-schemas';

export type PipelineStepId = 'base' | 'alert' | 'recovery' | 'noData';

export interface PipelineStep {
  id: PipelineStepId;
  title: string;
  when: string;
  /** Assembled ES|QL, or undefined when this step has no runnable query. */
  query?: string;
  /**
   * Step-specific segment within `query` to emphasize (alert condition,
   * recovery condition). Matched against the assembled query for highlight UI.
   */
  highlightSegment?: string;
  /** Extra hint under the when copy (e.g. assembly / strategy). */
  hint?: string;
  /** Prefer diagram + optional full query for long no-data queries. */
  preferDiagram?: boolean;
  /** Short label for light visual chips under the detail pane. */
  visualLabel?: string;
}

/** Thresholds from product decisions: diagram when complex. */
export const NO_DATA_COMPLEX_LINE_THRESHOLD = 40;
export const NO_DATA_COMPLEX_CHAR_THRESHOLD = 2000;

export const isComplexEsql = (query: string): boolean => {
  const lines = query.split('\n').length;
  return lines > NO_DATA_COMPLEX_LINE_THRESHOLD || query.length > NO_DATA_COMPLEX_CHAR_THRESHOLD;
};

export const buildPipelineSteps = (
  query: Query | undefined,
  recovery: Recovery | undefined,
  noData: NoData | undefined
): PipelineStep[] => {
  const hasBase = Boolean(query?.base?.trim());

  const baseQuery = hasBase && query ? getRootEsqlQuery(query) : undefined;
  const alertQuery = hasBase && query ? getBreachEsqlQuery(query) : undefined;
  const recoverQuery = hasBase && query ? getRecoverEsqlQuery(query, recovery) : undefined;
  const noDataQuery = hasBase && query ? getNoDataEsqlQuery(query, noData) : undefined;

  const recoveryHint = (() => {
    if (!recovery) {
      return i18n.translate('xpack.alertingV2.queryPipelineExplainer.recovery.hintMissing', {
        defaultMessage: 'Configure a recovery strategy to see the recovery query.',
      });
    }
    if (recovery.strategy === recoveryStrategy.no_breach) {
      return i18n.translate('xpack.alertingV2.queryPipelineExplainer.recovery.hintNoBreach', {
        defaultMessage:
          'With no_breach recovery, the series recovers when it no longer appears in Alert query results — there is no separate recovery ES|QL.',
      });
    }
    if (recovery.strategy === recoveryStrategy.manual) {
      return i18n.translate('xpack.alertingV2.queryPipelineExplainer.recovery.hintManual', {
        defaultMessage: 'Manual recovery does not run a recovery query. Close the alert yourself.',
      });
    }
    return undefined;
  })();

  const alertSegment = query?.breach?.segment?.trim() || undefined;
  const recoverySegment =
    recovery?.strategy === recoveryStrategy.condition ? recovery.segment?.trim() : undefined;

  return [
    {
      id: 'base',
      title: i18n.translate('xpack.alertingV2.queryPipelineExplainer.base.title', {
        defaultMessage: 'Base query',
      }),
      when: i18n.translate('xpack.alertingV2.queryPipelineExplainer.base.when', {
        defaultMessage:
          'Defines the data universe — indexes and transforms — before the alert condition is applied. Also used as the default presence check for no data.',
      }),
      query: baseQuery,
      hint: !hasBase
        ? i18n.translate('xpack.alertingV2.queryPipelineExplainer.base.hintEmpty', {
            defaultMessage: 'Complete the rule query to preview the assembled pipeline.',
          })
        : undefined,
      visualLabel: i18n.translate('xpack.alertingV2.queryPipelineExplainer.base.visual', {
        defaultMessage: 'Data universe',
      }),
    },
    {
      id: 'alert',
      title: i18n.translate('xpack.alertingV2.queryPipelineExplainer.alert.title', {
        defaultMessage: 'Alert query',
      }),
      when: i18n.translate('xpack.alertingV2.queryPipelineExplainer.alert.when', {
        defaultMessage:
          'On every schedule tick, the engine runs this full assembled query to decide whether a series is alerting.',
      }),
      query: alertQuery,
      highlightSegment: alertSegment,
      hint: hasBase
        ? i18n.translate('xpack.alertingV2.queryPipelineExplainer.alert.hintAssembly', {
            defaultMessage: 'Assembled from the base query plus the alert condition segment.',
          })
        : undefined,
      visualLabel: i18n.translate('xpack.alertingV2.queryPipelineExplainer.alert.visual', {
        defaultMessage: 'Each schedule tick',
      }),
    },
    {
      id: 'recovery',
      title: i18n.translate('xpack.alertingV2.queryPipelineExplainer.recovery.title', {
        defaultMessage: 'Recovery query',
      }),
      when: i18n.translate('xpack.alertingV2.queryPipelineExplainer.recovery.when', {
        defaultMessage:
          'After a series is active, this query (when configured) decides whether the series recovers.',
      }),
      query: recoverQuery,
      highlightSegment: recoverySegment,
      hint: recoveryHint,
      visualLabel: i18n.translate('xpack.alertingV2.queryPipelineExplainer.recovery.visual', {
        defaultMessage: 'While series is active',
      }),
    },
    {
      id: 'noData',
      title: i18n.translate('xpack.alertingV2.queryPipelineExplainer.noData.title', {
        defaultMessage: 'No-data check',
      }),
      when: i18n.translate('xpack.alertingV2.queryPipelineExplainer.noData.when', {
        defaultMessage:
          'A presence check — often the base query — to detect when a group stops returning data.',
      }),
      query: noDataQuery,
      preferDiagram: noDataQuery ? isComplexEsql(noDataQuery) : false,
      hint:
        noDataQuery == null
          ? i18n.translate('xpack.alertingV2.queryPipelineExplainer.noData.hintIgnore', {
              defaultMessage: 'This rule does not run a no-data check.',
            })
          : undefined,
      visualLabel: i18n.translate('xpack.alertingV2.queryPipelineExplainer.noData.visual', {
        defaultMessage: 'Presence check',
      }),
    },
  ];
};

/** Split assembled ES|QL so the step-specific segment can be highlighted. */
export const splitQueryForHighlight = (
  query: string,
  highlightSegment?: string
): { before: string; highlight: string; after: string } => {
  if (!highlightSegment?.trim()) {
    return { before: query, highlight: '', after: '' };
  }
  const normalized = highlightSegment.replace(/^\|?\s*/, '').trim();
  if (!normalized) {
    return { before: query, highlight: '', after: '' };
  }
  const idx = query.lastIndexOf(normalized);
  if (idx === -1) {
    return { before: query, highlight: '', after: '' };
  }
  return {
    before: query.slice(0, idx),
    highlight: query.slice(idx, idx + normalized.length),
    after: query.slice(idx + normalized.length),
  };
};

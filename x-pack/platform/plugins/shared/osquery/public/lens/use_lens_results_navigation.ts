/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type {
  PersistedIndexPatternLayer,
  PieVisualizationState,
  TermsIndexPatternColumn,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import { DOCUMENT_FIELD_NAME as RECORDS_FIELD } from '@kbn/lens-plugin/common/constants';
import { FilterStateStore } from '@kbn/es-query';
import type { LogsDataView } from '../common/hooks/use_logs_data_view';
import type { DateWindowResult } from '../common/pack_view_date_window';
import { isScheduledExecution } from '../common/is_scheduled_execution';
import { useKibana } from '../common/lib/kibana';
import { useLogsDataView } from '../common/hooks/use_logs_data_view';

export interface UseLensResultsNavigationArgs {
  actionId?: string;
  endDate?: string;
  startDate?: string;
  mode?: DateWindowResult['mode'];
  scheduleId?: string;
  executionCount?: number;
}

export interface UseLensResultsNavigationResult {
  /** Whether the current user can use the Lens editor at all. */
  canLens: boolean;
  /** True while the underlying logs data view hasn't resolved yet, or there's no action to chart. */
  isDisabled: boolean;
  /** Opens the prefilled Lens editor in a new tab. Call from an event handler that already
   * called `event.preventDefault()`, or directly from a menu action. */
  navigate: () => void;
}

/**
 * Builds the "navigate to a prefilled Lens editor" action for a single live-query action or a
 * single scheduled execution, reused by `ViewResultsInLensAction` (button/icon rendering) and the
 * results page's "View in" menu item.
 */
export const useLensResultsNavigation = ({
  actionId,
  endDate,
  startDate,
  mode,
  scheduleId,
  executionCount,
}: UseLensResultsNavigationArgs): UseLensResultsNavigationResult => {
  const lensService = useKibana().services.lens;
  const canLens = Boolean(lensService?.canUseEditor());
  const { data: logsDataView } = useLogsDataView({ skip: !actionId, checkOnly: true });

  const navigate = useCallback(() => {
    if (!logsDataView) {
      return;
    }

    const isScheduled = isScheduledExecution(scheduleId, executionCount);
    const defaultFrom = isScheduled ? 'now-7d' : 'now-1d';

    lensService?.navigateToPrefilledEditor(
      {
        id: '',
        time_range: {
          from: startDate ?? defaultFrom,
          to: endDate ?? 'now',
          mode: mode ?? (startDate || endDate ? 'absolute' : 'relative'),
        },
        attributes: isScheduled
          ? getLensAttributes(logsDataView, { scheduleId, executionCount })
          : getLensAttributes(logsDataView, { actionId }),
      },
      {
        openInNewTab: true,
        skipAppLeave: true,
      }
    );
  }, [actionId, endDate, executionCount, lensService, logsDataView, mode, scheduleId, startDate]);

  const isDisabled = useMemo(() => !actionId || !logsDataView, [actionId, logsDataView]);

  return { canLens, isDisabled, navigate };
};

interface LensAttributesOptions {
  actionId?: string;
  agentIds?: string[];
  scheduleId?: string;
  executionCount?: number;
}

export function getLensAttributes(
  logsDataView: LogsDataView,
  options: LensAttributesOptions = {}
): TypedLensByValueInput['attributes'] {
  const { actionId, agentIds, scheduleId, executionCount } = options;
  const dataLayer: PersistedIndexPatternLayer = {
    columnOrder: ['8690befd-fd69-4246-af4a-dd485d2a3b38', 'ed999e9d-204c-465b-897f-fe1a125b39ed'],
    columns: {
      '8690befd-fd69-4246-af4a-dd485d2a3b38': {
        sourceField: 'type',
        isBucketed: true,
        dataType: 'string',
        scale: 'ordinal',
        operationType: 'terms',
        label: 'Top values of type',
        params: {
          otherBucket: true,
          size: 5,
          missingBucket: false,
          orderBy: {
            columnId: 'ed999e9d-204c-465b-897f-fe1a125b39ed',
            type: 'column',
          },
          orderDirection: 'desc',
        },
      } as TermsIndexPatternColumn,
      'ed999e9d-204c-465b-897f-fe1a125b39ed': {
        sourceField: RECORDS_FIELD,
        isBucketed: false,
        dataType: 'number',
        scale: 'ratio',
        operationType: 'count',
        label: 'Count of records',
      },
    },
    incompleteColumns: {},
  };

  const xyConfig: PieVisualizationState = {
    shape: 'pie',
    layers: [
      {
        layerType: 'data',
        legendDisplay: 'default',
        nestedLegend: false,
        layerId: 'layer1',
        metrics: ['ed999e9d-204c-465b-897f-fe1a125b39ed'],
        numberDisplay: 'percent',
        primaryGroups: ['8690befd-fd69-4246-af4a-dd485d2a3b38'],
        categoryDisplay: 'default',
      },
    ],
  };

  const agentIdsQuery = agentIds?.length
    ? {
        bool: {
          minimum_should_match: 1,
          should: agentIds?.map((agentId) => ({ match_phrase: { 'agent.id': agentId } })),
        },
      }
    : undefined;

  const resultsIdentifier = scheduleId ?? actionId;

  return {
    visualizationType: 'lnsPie',
    title: `Action ${resultsIdentifier} results`,
    references: [
      {
        id: logsDataView.id,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: logsDataView.id,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
      {
        name: 'filter-index-pattern-0',
        id: logsDataView.id,
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            layer1: dataLayer,
          },
        },
      },
      filters: [
        ...(scheduleId && executionCount != null
          ? [
              {
                $state: { store: FilterStateStore.APP_STATE },
                meta: {
                  index: 'filter-index-pattern-0',
                  negate: false,
                  alias: null,
                  disabled: false,
                  params: { query: scheduleId },
                  type: 'phrase',
                  key: 'schedule_id',
                },
                query: { match_phrase: { schedule_id: scheduleId } },
              },
              {
                $state: { store: FilterStateStore.APP_STATE },
                meta: {
                  index: 'filter-index-pattern-0',
                  negate: false,
                  alias: null,
                  disabled: false,
                  params: { query: executionCount },
                  type: 'phrase',
                  key: 'osquery_meta.schedule_execution_count',
                },
                query: {
                  match_phrase: {
                    'osquery_meta.schedule_execution_count': executionCount,
                  },
                },
              },
            ]
          : [
              {
                $state: { store: FilterStateStore.APP_STATE },
                meta: {
                  index: 'filter-index-pattern-0',
                  negate: false,
                  alias: null,
                  disabled: false,
                  params: { query: actionId },
                  type: 'phrase',
                  key: 'action_id',
                },
                query: { match_phrase: { action_id: actionId } },
              },
            ]),
        ...(agentIdsQuery
          ? [
              {
                $state: { store: FilterStateStore.APP_STATE },
                meta: {
                  alias: 'agent IDs',
                  disabled: false,
                  index: 'filter-index-pattern-0',
                  key: 'query',
                  negate: false,
                  type: 'custom',
                  value: JSON.stringify(agentIdsQuery),
                },
                query: agentIdsQuery,
              },
            ]
          : []),
      ],
      query: { language: 'kuery', query: '' },
      visualization: xyConfig,
    },
  };
}

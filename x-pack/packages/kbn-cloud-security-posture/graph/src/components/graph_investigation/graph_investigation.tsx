/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  BooleanRelation,
  buildEsQuery,
  isCombinedFilter,
  buildCombinedFilter,
  isFilter,
  FilterStateStore,
} from '@kbn/es-query';
import type { Filter, Query, TimeRange, PhraseFilter } from '@kbn/es-query';
import { css } from '@emotion/react';
import { getEsQueryConfig } from '@kbn/data-service';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Graph } from '../../..';
import { useGraphNodeExpandPopover } from './use_graph_node_expand_popover';
import { useFetchGraphData } from '../../hooks/use_fetch_graph_data';
import { GRAPH_INVESTIGATION_TEST_ID } from '../test_ids';
import { ACTOR_ENTITY_ID, RELATED_ENTITY, TARGET_ENTITY_ID } from '../../common/constants';

const CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER = 'graph-investigation';

const buildPhraseFilter = (field: string, value: string, dataViewId?: string): PhraseFilter => ({
  meta: {
    key: field,
    index: dataViewId,
    negate: false,
    disabled: false,
    type: 'phrase',
    field,
    controlledBy: CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER,
    params: {
      query: value,
    },
  },
  query: {
    match_phrase: {
      [field]: value,
    },
  },
});

/**
 * Adds a filter to the existing list of filters based on the provided key and value.
 * It will always use the first filter in the list to build a combined filter with the new filter.
 *
 * @param dataViewId - The ID of the data view to which the filter belongs.
 * @param prev - The previous list of filters.
 * @param key - The key for the filter.
 * @param value - The value for the filter.
 * @returns A new list of filters with the added filter.
 */
const addFilter = (dataViewId: string, prev: Filter[], key: string, value: string) => {
  const [firstFilter, ...otherFilters] = prev;

  if (isCombinedFilter(firstFilter) && firstFilter?.meta?.relation === BooleanRelation.OR) {
    return [
      {
        ...firstFilter,
        meta: {
          ...firstFilter.meta,
          params: [
            ...(Array.isArray(firstFilter.meta.params) ? firstFilter.meta.params : []),
            buildPhraseFilter(key, value),
          ],
        },
      },
      ...otherFilters,
    ];
  } else if (isFilter(firstFilter) && firstFilter.meta?.type !== 'custom') {
    return [
      buildCombinedFilter(BooleanRelation.OR, [firstFilter, buildPhraseFilter(key, value)], {
        id: dataViewId,
      }),
      ...otherFilters,
    ];
  } else {
    return [
      {
        $state: {
          store: FilterStateStore.APP_STATE,
        },
        ...buildPhraseFilter(key, value, dataViewId),
      },
      ...prev,
    ];
  }
};

const useGraphPopovers = (
  dataViewId: string,
  setSearchFilters: React.Dispatch<React.SetStateAction<Filter[]>>
) => {
  const nodeExpandPopover = useGraphNodeExpandPopover({
    onExploreRelatedEntitiesClick: (node) => {
      setSearchFilters((prev) => addFilter(dataViewId, prev, RELATED_ENTITY, node.id));
    },
    onShowActionsByEntityClick: (node) => {
      setSearchFilters((prev) => addFilter(dataViewId, prev, ACTOR_ENTITY_ID, node.id));
    },
    onShowActionsOnEntityClick: (node) => {
      setSearchFilters((prev) => addFilter(dataViewId, prev, TARGET_ENTITY_ID, node.id));
    },
  });

  const openPopoverCallback = useCallback(
    (cb: Function, ...args: unknown[]) => {
      [nodeExpandPopover].forEach(({ actions: { closePopover } }) => {
        closePopover();
      });
      cb(...args);
    },
    [nodeExpandPopover]
  );

  return { nodeExpandPopover, openPopoverCallback };
};

interface GraphInvestigationProps {
  dataView: DataView;
  eventIds: string[];
  timestamp: string | null;
}

/**
 * Graph investigation view allows the user to expand nodes and view related entities.
 */
export const GraphInvestigation: React.FC<GraphInvestigationProps> = memo(
  ({ dataView, eventIds, timestamp = new Date().toISOString() }: GraphInvestigationProps) => {
    const [searchFilters, setSearchFilters] = useState<Filter[]>(() => []);
    const [timeRange, setTimeRange] = useState<TimeRange>({
      from: `${timestamp}||-30m`,
      to: `${timestamp}||+30m`,
    });

    const {
      services: { uiSettings },
    } = useKibana();
    const query = useMemo(
      () =>
        buildEsQuery(
          dataView,
          [],
          [...searchFilters],
          getEsQueryConfig(uiSettings as Parameters<typeof getEsQueryConfig>[0])
        ),
      [searchFilters, dataView, uiSettings]
    );

    const { nodeExpandPopover, openPopoverCallback } = useGraphPopovers(
      dataView?.id ?? '',
      setSearchFilters
    );
    const expandButtonClickHandler = (...args: unknown[]) =>
      openPopoverCallback(nodeExpandPopover.onNodeExpandButtonClick, ...args);
    const isPopoverOpen = [nodeExpandPopover].some(({ state: { isOpen } }) => isOpen);
    const { data, refresh, isFetching } = useFetchGraphData({
      req: {
        query: {
          eventIds,
          esQuery: query,
          start: timeRange.from,
          end: timeRange.to,
        },
      },
      options: {
        refetchOnWindowFocus: false,
        keepPreviousData: true,
      },
    });

    const nodes = useMemo(() => {
      return (
        data?.nodes.map((node) => {
          const nodeHandlers =
            node.shape !== 'label' && node.shape !== 'group'
              ? {
                  expandButtonClick: expandButtonClickHandler,
                }
              : undefined;
          return { ...node, ...nodeHandlers };
        }) ?? []
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.nodes]);

    return (
      <>
        <EuiFlexGroup
          data-test-subj={GRAPH_INVESTIGATION_TEST_ID}
          direction="column"
          gutterSize="none"
          css={css`
            height: 100%;
          `}
        >
          {dataView && (
            <EuiFlexItem grow={false}>
              <SearchBar<Query>
                {...{
                  appName: 'graph-investigation',
                  intl: null,
                  showFilterBar: true,
                  showDatePicker: true,
                  showAutoRefreshOnly: false,
                  showSaveQuery: false,
                  showQueryInput: false,
                  isLoading: isFetching,
                  isAutoRefreshDisabled: true,
                  dateRangeFrom: timeRange.from,
                  dateRangeTo: timeRange.to,
                  query: { query: '', language: 'kuery' },
                  indexPatterns: [dataView],
                  filters: searchFilters,
                  submitButtonStyle: 'iconOnly',
                  onFiltersUpdated: (newFilters) => {
                    setSearchFilters(newFilters);
                  },
                  onQuerySubmit: (payload, isUpdate) => {
                    if (isUpdate) {
                      setTimeRange({ ...payload.dateRange });
                    } else {
                      refresh();
                    }
                  },
                }}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <Graph
              css={css`
                height: 100%;
                width: 100%;
              `}
              nodes={nodes}
              edges={data?.edges ?? []}
              interactive={true}
              isLocked={isPopoverOpen}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <nodeExpandPopover.PopoverComponent />
      </>
    );
  }
);

GraphInvestigation.displayName = 'GraphInvestigation';

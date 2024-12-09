/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  BooleanRelation,
  buildEsQuery,
  isCombinedFilter,
  buildCombinedFilter,
  isPhraseFilter,
} from '@kbn/es-query';
import type { Filter, Query, TimeRange, BoolQuery, PhraseFilter } from '@kbn/es-query';
import { css } from '@emotion/react';
import { getEsQueryConfig } from '@kbn/data-service';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Graph, type NodeViewModel } from '../../..';
import { useGraphNodeExpandPopover } from './use_graph_node_expand_popover';
import { useFetchGraphData } from '../../hooks/use_fetch_graph_data';

const CONTROLLED_BY_GRAPH_INVESTIGATION_FILTER = 'graph-investigation';

const useTimeRange = (timestamp: string) => {
  const [timeRange, setTimeRange] = useState<TimeRange>({
    from: `${timestamp}||-30m`,
    to: `${timestamp}||+30m`,
  });

  const setPartialTimeRange = (newTimeRange: Partial<typeof timeRange>) => {
    setTimeRange((currTimeRange) => ({ ...currTimeRange, ...newTimeRange }));
  };

  return { timeRange, setTimeRange, setPartialTimeRange };
};

const useGraphData = (eventIds: string[], timeRange: TimeRange, filter: { bool: BoolQuery }) => {
  const { data, refresh, isFetching } = useFetchGraphData({
    req: {
      query: {
        eventIds,
        esQuery: filter,
        start: timeRange.from,
        end: timeRange.to,
      },
    },
    options: {
      refetchOnWindowFocus: false,
      keepPreviousData: true,
    },
  });

  return { data, refresh, isFetching };
};

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
  } else if (isPhraseFilter(firstFilter)) {
    return [
      buildCombinedFilter(BooleanRelation.OR, [firstFilter, buildPhraseFilter(key, value)], {
        id: dataViewId,
      }),
      ...otherFilters,
    ];
  } else {
    return [buildPhraseFilter(key, value, dataViewId), ...prev];
  }
};

const useGraphPopovers = (
  dataViewId: string,
  setSearchFilters: React.Dispatch<React.SetStateAction<Filter[]>>
) => {
  const nodeExpandPopover = useGraphNodeExpandPopover({
    onExploreRelatedEntitiesClick: (node) => {
      setSearchFilters((prev) => addFilter(dataViewId, prev, 'related.entity', node.id));
    },
    onShowActionsByEntityClick: (node) => {
      setSearchFilters((prev) => addFilter(dataViewId, prev, 'actor.entity.id', node.id));
    },
    onShowActionsOnEntityClick: (node) => {
      setSearchFilters((prev) => addFilter(dataViewId, prev, 'target.entity.id', node.id));
    },
  });

  const popovers = [nodeExpandPopover];
  const popoverOpenWrapper = (cb: Function, ...args: unknown[]) => {
    popovers.forEach(({ actions: { closePopover } }) => {
      closePopover();
    });
    cb(...args);
  };

  return { nodeExpandPopover, popoverOpenWrapper };
};

const useGraphNodes = (
  nodes: NodeViewModel[],
  expandButtonClickHandler: (...args: unknown[]) => void
) => {
  return useMemo(() => {
    return nodes.map((node) => {
      const nodeHandlers =
        node.shape !== 'label' && node.shape !== 'group'
          ? {
              expandButtonClick: expandButtonClickHandler,
            }
          : undefined;
      return { ...node, ...nodeHandlers };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);
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
  ({ dataView, eventIds, timestamp }: GraphInvestigationProps) => {
    const [searchFilters, setSearchFilters] = useState<Filter[]>(() => []);
    const { timeRange, setTimeRange } = useTimeRange(timestamp ?? new Date().toISOString());

    const {
      services: { uiSettings },
    } = useKibana();
    const [query, setQuery] = useState<{ bool: BoolQuery }>(
      buildEsQuery(
        dataView,
        [],
        [...searchFilters],
        getEsQueryConfig(uiSettings as Parameters<typeof getEsQueryConfig>[0])
      )
    );

    useEffect(() => {
      setQuery(
        buildEsQuery(
          dataView,
          [],
          [...searchFilters],
          getEsQueryConfig(uiSettings as Parameters<typeof getEsQueryConfig>[0])
        )
      );
    }, [searchFilters, dataView, uiSettings]);

    const { nodeExpandPopover, popoverOpenWrapper } = useGraphPopovers(
      dataView?.id ?? '',
      setSearchFilters
    );
    const expandButtonClickHandler = (...args: unknown[]) =>
      popoverOpenWrapper(nodeExpandPopover.onNodeExpandButtonClick, ...args);
    const isPopoverOpen = [nodeExpandPopover].some(({ state: { isOpen } }) => isOpen);
    const { data, refresh, isFetching } = useGraphData(eventIds, timeRange, query);
    const nodes = useGraphNodes(data?.nodes ?? [], expandButtonClickHandler);

    return (
      <>
        <EuiFlexGroup
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

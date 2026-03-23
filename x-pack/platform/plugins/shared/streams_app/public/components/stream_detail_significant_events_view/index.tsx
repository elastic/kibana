/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import { upperFirst } from 'lodash';
import React, { useMemo, useState } from 'react';
import { useFetchDiscoveryQueries } from '../../hooks/use_fetch_discovery_queries';
import { useStreamFeatures } from '../../hooks/use_stream_features';
import { LoadingPanel } from '../loading_panel';
import { EmptyState } from './empty_state';
import { RulesTable } from './rules_table';
import { SignificantEventsTable } from './significant_events_table';

interface Props {
  definition: Streams.all.GetResponse;
}

export function StreamDetailSignificantEventsView({ definition }: Props) {
  const [tableSearchValue, setTableSearchValue] = useState('');
  const [isTypeFilterPopoverOpen, setIsTypeFilterPopoverOpen] = useState(false);
  const [isKnowledgeIndicatorTypeFilterPopoverOpen, setIsKnowledgeIndicatorTypeFilterPopoverOpen] =
    useState(false);
  const [selectedKnowledgeIndicatorTypes, setSelectedKnowledgeIndicatorTypes] = useState<string[]>(
    []
  );
  const [typeFilterOptions, setTypeFilterOptions] = useState<EuiSelectableOption[]>([
    {
      key: 'knowledge_indicator',
      checked: 'on',
      label: i18n.translate(
        'xpack.streams.significantEventsTable.typeFilter.knowledgeIndicatorsLabel',
        {
          defaultMessage: 'Knowledge Indicators',
        }
      ),
    },
    {
      key: 'rule',
      label: i18n.translate('xpack.streams.significantEventsTable.typeFilter.rulesLabel', {
        defaultMessage: 'Rules',
      }),
    },
  ]);
  const queriesFetchState = useFetchDiscoveryQueries({
    name: definition.stream.name,
    query: '',
    page: 1,
    perPage: 1000,
    status: ['active', 'draft'],
  });
  const { features, featuresLoading } = useStreamFeatures(definition.stream);
  const typeFilterPopoverId = useGeneratedHtmlId({
    prefix: 'significantEventsTypeFilterPopover',
  });
  const knowledgeIndicatorTypeFilterPopoverId = useGeneratedHtmlId({
    prefix: 'knowledgeIndicatorTypeFilterPopover',
  });

  const ruleQueries = useMemo(
    () => (queriesFetchState.data?.queries ?? []).filter((queryRow) => queryRow.rule_backed),
    [queriesFetchState.data?.queries]
  );

  const knowledgeIndicators = useMemo<KnowledgeIndicator[]>(() => {
    const queryKnowledgeIndicators = (queriesFetchState.data?.queries ?? []).map((queryRow) => ({
      kind: 'query' as const,
      query: queryRow.query,
      rule: {
        backed: queryRow.rule_backed,
        id: queryRow.query.id,
      },
      stream_name: queryRow.stream_name,
    }));

    return [
      ...features.map((feature) => ({ kind: 'feature' as const, feature })),
      ...queryKnowledgeIndicators,
    ];
  }, [features, queriesFetchState.data?.queries]);

  const isRulesSelected = useMemo(
    () => typeFilterOptions.some((option) => option.key === 'rule' && option.checked === 'on'),
    [typeFilterOptions]
  );
  const selectedTypeFilterLabel = useMemo(
    () => typeFilterOptions.find((option) => option.checked === 'on')?.label,
    [typeFilterOptions]
  );
  const hasActiveKnowledgeIndicatorTypeFilters = selectedKnowledgeIndicatorTypes.length > 0;
  const availableKnowledgeIndicatorTypes = useMemo(() => {
    const types = new Set<string>();

    knowledgeIndicators.forEach((knowledgeIndicator) => {
      if (knowledgeIndicator.kind === 'feature') {
        types.add(knowledgeIndicator.feature.type);
      } else {
        types.add('query');
      }
    });

    return Array.from(types).sort((left, right) => left.localeCompare(right));
  }, [knowledgeIndicators]);
  const knowledgeIndicatorTypeCounts = useMemo(() => {
    const normalizedSearchTerm = tableSearchValue.trim().toLowerCase();
    const counts: Record<string, number> = {};

    knowledgeIndicators.forEach((knowledgeIndicator) => {
      const type =
        knowledgeIndicator.kind === 'feature' ? knowledgeIndicator.feature.type : 'query';

      const title =
        knowledgeIndicator.kind === 'feature'
          ? (knowledgeIndicator.feature.title ?? '').toLowerCase()
          : (knowledgeIndicator.query.title ?? '').toLowerCase();

      if (!normalizedSearchTerm || title.includes(normalizedSearchTerm)) {
        counts[type] = (counts[type] ?? 0) + 1;
      }
    });

    return counts;
  }, [knowledgeIndicators, tableSearchValue]);
  const knowledgeIndicatorTypeFilterOptions = useMemo<EuiSelectableOption[]>(
    () => [
      {
        label: i18n.translate(
          'xpack.streams.significantEventsTable.knowledgeIndicatorTypeFilterGroupLabel',
          {
            defaultMessage: 'Filter by field type',
          }
        ),
        isGroupLabel: true,
      },
      ...availableKnowledgeIndicatorTypes.map((type) => ({
        key: type,
        checked: selectedKnowledgeIndicatorTypes.includes(type) ? ('on' as const) : undefined,
        label:
          type === 'query'
            ? i18n.translate('xpack.streams.significantEventsTable.knowledgeIndicatorType.query', {
                defaultMessage: 'Query',
              })
            : upperFirst(type),
        append: <EuiBadge>{knowledgeIndicatorTypeCounts[type] ?? 0}</EuiBadge>,
      })),
    ],
    [
      availableKnowledgeIndicatorTypes,
      knowledgeIndicatorTypeCounts,
      selectedKnowledgeIndicatorTypes,
    ]
  );

  if (queriesFetchState.isLoading || featuresLoading) {
    return <LoadingPanel size="xxl" />;
  }

  const noSignificantEvents =
    !queriesFetchState.isLoading &&
    !featuresLoading &&
    features.length === 0 &&
    (queriesFetchState.data?.queries.length ?? 0) === 0;

  if (noSignificantEvents) {
    return <EmptyState onManualEntryClick={() => {}} onGenerateSuggestionsClick={() => {}} />;
  }

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder={false} hasShadow={true}>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              responsive={false}
              css={css`
                width: 100%;
                min-height: 44px;
              `}
            >
              <EuiFlexItem grow={false}>
                <EuiPopover
                  id={typeFilterPopoverId}
                  aria-label={i18n.translate(
                    'xpack.streams.significantEventsTable.typeFilterPopoverLabel',
                    {
                      defaultMessage: 'Type filter',
                    }
                  )}
                  button={
                    <EuiButton
                      iconType="arrowDown"
                      iconSide="right"
                      color="text"
                      onClick={() => setIsTypeFilterPopoverOpen((isOpen) => !isOpen)}
                    >
                      {selectedTypeFilterLabel ??
                        i18n.translate('xpack.streams.significantEventsTable.typeFilterLabel', {
                          defaultMessage: 'Knowledge Indicators',
                        })}
                    </EuiButton>
                  }
                  isOpen={isTypeFilterPopoverOpen}
                  closePopover={() => setIsTypeFilterPopoverOpen(false)}
                  panelPaddingSize="none"
                >
                  <EuiSelectable
                    aria-label={i18n.translate(
                      'xpack.streams.significantEventsTable.typeFilterSelectableAriaLabel',
                      {
                        defaultMessage: 'Filter by type',
                      }
                    )}
                    singleSelection="always"
                    options={typeFilterOptions}
                    onChange={(options) => {
                      setTypeFilterOptions(options);
                      setIsTypeFilterPopoverOpen(false);
                    }}
                  >
                    {(list) => (
                      <div
                        css={css`
                          min-width: 260px;
                        `}
                      >
                        {list}
                      </div>
                    )}
                  </EuiSelectable>
                </EuiPopover>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFieldSearch
                  fullWidth
                  value={tableSearchValue}
                  onChange={(event) => setTableSearchValue(event.target.value)}
                  placeholder={i18n.translate(
                    'xpack.streams.significantEventsTable.searchPlaceholder',
                    {
                      defaultMessage: 'Search significant events',
                    }
                  )}
                  aria-label={i18n.translate(
                    'xpack.streams.significantEventsTable.searchAriaLabel',
                    {
                      defaultMessage: 'Search significant events',
                    }
                  )}
                />
              </EuiFlexItem>
              {!isRulesSelected ? (
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    id={knowledgeIndicatorTypeFilterPopoverId}
                    aria-label={i18n.translate(
                      'xpack.streams.significantEventsTable.knowledgeIndicatorTypeFilterPopoverLabel',
                      {
                        defaultMessage: 'Knowledge indicator type filter',
                      }
                    )}
                    button={
                      <EuiButton
                        iconType="arrowDown"
                        iconSide="right"
                        color={hasActiveKnowledgeIndicatorTypeFilters ? 'primary' : 'text'}
                        fill={hasActiveKnowledgeIndicatorTypeFilters}
                        onClick={() =>
                          setIsKnowledgeIndicatorTypeFilterPopoverOpen((isOpen) => !isOpen)
                        }
                      >
                        {i18n.translate(
                          'xpack.streams.significantEventsTable.knowledgeIndicatorTypeFilterLabel',
                          {
                            defaultMessage: 'Type',
                          }
                        )}
                      </EuiButton>
                    }
                    isOpen={isKnowledgeIndicatorTypeFilterPopoverOpen}
                    closePopover={() => setIsKnowledgeIndicatorTypeFilterPopoverOpen(false)}
                    panelPaddingSize="none"
                  >
                    <EuiSelectable
                      aria-label={i18n.translate(
                        'xpack.streams.significantEventsTable.knowledgeIndicatorTypeFilterSelectableAriaLabel',
                        {
                          defaultMessage: 'Filter knowledge indicators by type',
                        }
                      )}
                      options={knowledgeIndicatorTypeFilterOptions}
                      onChange={(options) => {
                        setSelectedKnowledgeIndicatorTypes(
                          options
                            .filter((option) => option.checked === 'on')
                            .map((option) => String(option.key ?? option.label))
                        );
                      }}
                    >
                      {(list) => (
                        <div
                          css={css`
                            min-width: 260px;
                          `}
                        >
                          {list}
                        </div>
                      )}
                    </EuiSelectable>
                  </EuiPopover>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            {isRulesSelected ? (
              <RulesTable rules={ruleQueries} searchTerm={tableSearchValue} />
            ) : (
              <SignificantEventsTable
                knowledgeIndicators={knowledgeIndicators}
                searchTerm={tableSearchValue}
                selectedTypes={selectedKnowledgeIndicatorTypes}
              />
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

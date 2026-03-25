/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/react-hooks';
import { useQueryClient } from '@kbn/react-query';
import {
  TaskStatus,
  type OnboardingResult,
  type Streams,
  type TaskResult,
} from '@kbn/streams-schema';
import React, { useCallback, useMemo, useState } from 'react';
import {
  DISCOVERY_QUERIES_QUERY_KEY,
  useFetchDiscoveryQueries,
} from '../../hooks/use_fetch_discovery_queries';
import { useKibana } from '../../hooks/use_kibana';
import { LoadingPanel } from '../loading_panel';
import { EmptyState } from './empty_state';
import { useFetchKnowledgeIndicators } from './hooks/use_knowledge_indicators_data';
import { KnowledgeIndicatorsTable } from './knowledge_indicators_table';
import { useKnowledgeIndicatorsTask } from './hooks/use_knowledge_indicators_task';
import { KnowledgeIndicatorRulesSelector } from './knowledge_indicator_rules_selector';
import { KnowledgeIndicatorsStatusFilter } from './knowledge_indicators_status_filter';
import { KnowledgeIndicatorsTypeFilter } from './knowledge_indicators_type_filter';
import { RulesTable } from './rules_table';

const SEARCH_DEBOUNCE_MS = 300;

interface Props {
  definition: Streams.all.GetResponse;
}

export function StreamDetailSignificantEventsView({ definition }: Props) {
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const queryClient = useQueryClient();
  const [tableSearchValue, setTableSearchValue] = useState('');
  const debouncedTableSearchValue = useDebouncedValue(tableSearchValue, SEARCH_DEBOUNCE_MS);
  const [knowledgeIndicatorStatusFilter, setKnowledgeIndicatorStatusFilter] = useState<
    'active' | 'excluded'
  >('active');
  const [selectedKnowledgeIndicatorTypes, setSelectedKnowledgeIndicatorTypes] = useState<string[]>(
    []
  );
  const [typeFilterOptions, setTypeFilterOptions] = useState<EuiSelectableOption[]>([
    {
      key: 'knowledge_indicator',
      checked: 'on',
      label: KNOWLEDGE_INDICATORS_FILTER_LABEL,
    },
    {
      key: 'rule',
      label: RULES_FILTER_LABEL,
    },
  ]);
  const rulesQueriesFetchState = useFetchDiscoveryQueries({
    name: definition.stream.name,
    query: '',
    page: 1,
    perPage: 1000,
    status: ['active'],
  });
  const {
    knowledgeIndicators,
    isLoading: isKnowledgeIndicatorsLoading,
    isEmpty,
  } = useFetchKnowledgeIndicators({ definition });
  const onKnowledgeIndicatorsTaskComplete = useCallback(
    (
      completedTaskState: Extract<TaskResult<OnboardingResult>, { status: TaskStatus.Completed }>
    ) => {
      const queriesTaskResult = completedTaskState.queriesTaskResult;
      const generatedKnowledgeIndicatorsCount =
        queriesTaskResult?.status === TaskStatus.Completed ? queriesTaskResult.queries.length : 0;

      toasts.addSuccess({
        title: i18n.translate(
          'xpack.streams.significantEventsTable.generateMoreSuccessToastTitle',
          {
            defaultMessage:
              '{count, plural, one {Generated # knowledge indicator} other {Generated # knowledge indicators}}',
            values: {
              count: generatedKnowledgeIndicatorsCount,
            },
          }
        ),
      });

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['features', definition.stream.name] }),
      ]);
    },
    [definition.stream.name, queryClient, toasts]
  );

  const {
    isPending: isKnowledgeIndicatorsGenerationPending,
    knowledgeIndicatorsTaskState,
    scheduleKnowledgeIndicatorsTask,
    cancelKnowledgeIndicatorsTask,
  } = useKnowledgeIndicatorsTask({
    streamName: definition.stream.name,
    onComplete: onKnowledgeIndicatorsTaskComplete,
  });

  const ruleQueries = useMemo(
    () => (rulesQueriesFetchState.data?.queries ?? []).filter((queryRow) => queryRow.rule_backed),
    [rulesQueriesFetchState.data?.queries]
  );
  const occurrencesByQueryId = useMemo(
    () =>
      Object.fromEntries(
        ruleQueries.map((ruleQuery) => [ruleQuery.query.id, ruleQuery.occurrences] as const)
      ),
    [ruleQueries]
  );

  const isRulesSelected = useMemo(
    () => typeFilterOptions.some((option) => option.key === 'rule' && option.checked === 'on'),
    [typeFilterOptions]
  );
  const isKnowledgeIndicatorsGenerationCanceling =
    knowledgeIndicatorsTaskState?.status === TaskStatus.BeingCanceled;

  if (isKnowledgeIndicatorsLoading || (isRulesSelected && rulesQueriesFetchState.isLoading)) {
    return <LoadingPanel size="xxl" />;
  }

  if (isEmpty) {
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
                <KnowledgeIndicatorRulesSelector
                  options={typeFilterOptions}
                  onChange={setTypeFilterOptions}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFieldSearch
                  fullWidth
                  value={tableSearchValue}
                  onChange={(event) => setTableSearchValue(event.target.value)}
                  placeholder={SIGNIFICANT_EVENTS_SEARCH_PLACEHOLDER}
                  aria-label={SIGNIFICANT_EVENTS_SEARCH_ARIA_LABEL}
                />
              </EuiFlexItem>
              {!isRulesSelected ? (
                <EuiFlexItem grow={false}>
                  <KnowledgeIndicatorsStatusFilter
                    knowledgeIndicators={knowledgeIndicators}
                    searchTerm={debouncedTableSearchValue}
                    selectedTypes={selectedKnowledgeIndicatorTypes}
                    statusFilter={knowledgeIndicatorStatusFilter}
                    onStatusFilterChange={setKnowledgeIndicatorStatusFilter}
                  />
                </EuiFlexItem>
              ) : null}
              {!isRulesSelected ? (
                <EuiFlexItem grow={false}>
                  <KnowledgeIndicatorsTypeFilter
                    knowledgeIndicators={knowledgeIndicators}
                    searchTerm={debouncedTableSearchValue}
                    statusFilter={knowledgeIndicatorStatusFilter}
                    selectedTypes={selectedKnowledgeIndicatorTypes}
                    onSelectedTypesChange={setSelectedKnowledgeIndicatorTypes}
                  />
                </EuiFlexItem>
              ) : null}
              {!isRulesSelected ? (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                    {isKnowledgeIndicatorsGenerationPending ? (
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          aria-label={CANCEL_GENERATION_BUTTON_ARIA_LABEL}
                          iconType="stop"
                          onClick={cancelKnowledgeIndicatorsTask}
                        />
                      </EuiFlexItem>
                    ) : null}
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        color="primary"
                        isLoading={isKnowledgeIndicatorsGenerationPending}
                        isDisabled={
                          knowledgeIndicatorsTaskState === null ||
                          isKnowledgeIndicatorsGenerationPending
                        }
                        onClick={scheduleKnowledgeIndicatorsTask}
                      >
                        {isKnowledgeIndicatorsGenerationPending
                          ? isKnowledgeIndicatorsGenerationCanceling
                            ? CANCELING_BUTTON_LABEL
                            : GENERATING_BUTTON_LABEL
                          : GENERATE_MORE_BUTTON_LABEL}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            {isRulesSelected ? (
              <RulesTable
                definition={definition.stream}
                rules={ruleQueries}
                searchTerm={debouncedTableSearchValue}
              />
            ) : (
              <KnowledgeIndicatorsTable
                definition={definition.stream}
                knowledgeIndicators={knowledgeIndicators}
                occurrencesByQueryId={occurrencesByQueryId}
                searchTerm={debouncedTableSearchValue}
                selectedTypes={selectedKnowledgeIndicatorTypes}
                statusFilter={knowledgeIndicatorStatusFilter}
              />
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

const KNOWLEDGE_INDICATORS_FILTER_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.typeFilter.knowledgeIndicatorsLabel',
  {
    defaultMessage: 'Knowledge Indicators',
  }
);

const RULES_FILTER_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.typeFilter.rulesLabel',
  {
    defaultMessage: 'Rules',
  }
);

const SIGNIFICANT_EVENTS_SEARCH_PLACEHOLDER = i18n.translate(
  'xpack.streams.significantEventsTable.searchPlaceholder',
  {
    defaultMessage: 'Search significant events',
  }
);

const SIGNIFICANT_EVENTS_SEARCH_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.searchAriaLabel',
  {
    defaultMessage: 'Search significant events',
  }
);

const GENERATE_MORE_BUTTON_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.generateMoreButtonLabel',
  {
    defaultMessage: 'Generate more',
  }
);

const GENERATING_BUTTON_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.generatingButtonLabel',
  {
    defaultMessage: 'Generating',
  }
);

const CANCELING_BUTTON_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.cancelingButtonLabel',
  {
    defaultMessage: 'Canceling',
  }
);

const CANCEL_GENERATION_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.cancelGenerationButtonAriaLabel',
  {
    defaultMessage: 'Cancel generation',
  }
);

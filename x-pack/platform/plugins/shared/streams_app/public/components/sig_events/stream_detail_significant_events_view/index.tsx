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
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import React, { useCallback, useMemo, useState } from 'react';
import useInterval from 'react-use/lib/useInterval';
import { DISCOVERY_QUERIES_QUERY_KEY } from '../../../hooks/sig_events/use_fetch_discovery_queries';
import { useKibana } from '../../../hooks/use_kibana';
import { EmptyState } from './empty_state';
import { useFetchKnowledgeIndicators } from './hooks/use_knowledge_indicators_data';
import { KnowledgeIndicatorsTable } from './knowledge_indicators_table';
import { KnowledgeIndicatorDetailsFlyout } from './knowledge_indicator_details_flyout';
import { useKnowledgeIndicatorsTask } from './hooks/use_knowledge_indicators_task';
import { KnowledgeIndicatorRulesSelector } from './knowledge_indicator_rules_selector';
import { KnowledgeIndicatorsStatusFilter } from './knowledge_indicators_status_filter';
import { KnowledgeIndicatorsTypeFilter } from './knowledge_indicators_type_filter';
import { RulesTable } from './rules_table';
import { LoadingPanel } from '../../loading_panel';
import { PromotionCallout } from './promotion_callout/promotion_callout';
import { SuggestedRulesFlyout } from './suggested_rules_flyout/suggested_rules_flyout';
import { getKnowledgeIndicatorItemId } from './utils/get_knowledge_indicator_item_id';

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
  const [selectedKnowledgeIndicator, setSelectedKnowledgeIndicator] =
    useState<KnowledgeIndicator | null>(null);
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
  const {
    knowledgeIndicators,
    occurrencesByQueryId,
    isLoading: isKnowledgeIndicatorsLoading,
    isEmpty,
    refetch,
  } = useFetchKnowledgeIndicators({ definition });
  const onKnowledgeIndicatorsTaskComplete = useCallback(
    (
      completedTaskState: Extract<TaskResult<OnboardingResult>, { status: TaskStatus.Completed }>
    ) => {
      const queriesTaskResult = completedTaskState.queriesTaskResult;
      const featuresTaskResult = completedTaskState.featuresTaskResult;
      const generatedFeaturesCount =
        featuresTaskResult?.status === TaskStatus.Completed
          ? featuresTaskResult.features.length
          : 0;
      const generatedQueriesCount =
        queriesTaskResult?.status === TaskStatus.Completed ? queriesTaskResult.queries.length : 0;

      toasts.addSuccess({
        title: i18n.translate(
          'xpack.streams.significantEventsTable.generateMoreSuccessToastTitle',
          {
            defaultMessage:
              '{count, plural, one {Generated # knowledge indicator} other {Generated # knowledge indicators}}',
            values: {
              count: generatedFeaturesCount + generatedQueriesCount,
            },
          }
        ),
      });

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: DISCOVERY_QUERIES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['features', definition.stream.name] }),
        queryClient.invalidateQueries({
          queryKey: ['onboardingTaskStatus', definition.stream.name],
        }),
      ]);
    },
    [definition.stream.name, queryClient, toasts]
  );

  const onKnowledgeIndicatorsTaskError = useCallback(
    (failedTaskState: Extract<TaskResult<OnboardingResult>, { status: TaskStatus.Failed }>) => {
      toasts.addDanger({
        title: KNOWLEDGE_INDICATORS_TASK_FAILED_TOAST_TITLE,
        text: failedTaskState.error,
      });
    },
    [toasts]
  );

  const {
    isPending: isKnowledgeIndicatorsGenerationPending,
    knowledgeIndicatorsTaskState,
    scheduleKnowledgeIndicatorsTask,
    cancelKnowledgeIndicatorsTask,
  } = useKnowledgeIndicatorsTask({
    streamName: definition.stream.name,
    onComplete: onKnowledgeIndicatorsTaskComplete,
    onError: onKnowledgeIndicatorsTaskError,
  });

  useInterval(
    refetch,
    knowledgeIndicatorsTaskState?.status === TaskStatus.InProgress ? 5000 : null
  );

  const ruleKnowledgeIndicators = useMemo(
    () =>
      knowledgeIndicators.filter(
        (knowledgeIndicator) =>
          knowledgeIndicator.kind === 'query' && knowledgeIndicator.rule.backed
      ),
    [knowledgeIndicators]
  );
  const [isSuggestedRulesFlyoutOpen, setIsSuggestedRulesFlyoutOpen] = useState(false);
  const selectedKnowledgeIndicatorId = selectedKnowledgeIndicator
    ? getKnowledgeIndicatorItemId(selectedKnowledgeIndicator)
    : undefined;

  const toggleSelectedKnowledgeIndicator = useCallback((knowledgeIndicator: KnowledgeIndicator) => {
    setSelectedKnowledgeIndicator((currentKnowledgeIndicator) => {
      if (!currentKnowledgeIndicator) {
        return knowledgeIndicator;
      }

      const currentId = getKnowledgeIndicatorItemId(currentKnowledgeIndicator);
      const nextId = getKnowledgeIndicatorItemId(knowledgeIndicator);

      return currentId === nextId ? null : knowledgeIndicator;
    });
  }, []);

  const isRulesSelected = useMemo(
    () => typeFilterOptions.some((option) => option.key === 'rule' && option.checked === 'on'),
    [typeFilterOptions]
  );
  const isKnowledgeIndicatorsGenerationCanceling =
    knowledgeIndicatorsTaskState?.status === TaskStatus.BeingCanceled;
  const isGenerateButtonDisabled =
    knowledgeIndicatorsTaskState === null || isKnowledgeIndicatorsGenerationPending;

  if (isKnowledgeIndicatorsLoading) {
    return <LoadingPanel size="xxl" />;
  }

  if (isEmpty) {
    return (
      <EmptyState
        isGenerating={isKnowledgeIndicatorsGenerationPending}
        isCanceling={isKnowledgeIndicatorsGenerationCanceling}
        isGenerateDisabled={isGenerateButtonDisabled}
        onGenerateSuggestionsClick={scheduleKnowledgeIndicatorsTask}
        onCancelGenerationClick={cancelKnowledgeIndicatorsTask}
      />
    );
  }

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <PromotionCallout
            streamName={definition.stream.name}
            onReviewClick={() => setIsSuggestedRulesFlyoutOpen(true)}
          />
        </EuiFlexItem>

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
                  <KnowledgeIndicatorsGenerationControls
                    isGenerating={isKnowledgeIndicatorsGenerationPending}
                    isCanceling={isKnowledgeIndicatorsGenerationCanceling}
                    isGenerateDisabled={isGenerateButtonDisabled}
                    onGenerateSuggestionsClick={scheduleKnowledgeIndicatorsTask}
                    onCancelGenerationClick={cancelKnowledgeIndicatorsTask}
                  />
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
            <EuiSpacer size="m" />
            {isRulesSelected ? (
              <RulesTable
                definition={definition.stream}
                rules={ruleKnowledgeIndicators}
                occurrencesByQueryId={occurrencesByQueryId}
                searchTerm={debouncedTableSearchValue}
                selectedKnowledgeIndicatorId={selectedKnowledgeIndicatorId}
                onViewDetails={toggleSelectedKnowledgeIndicator}
              />
            ) : (
              <KnowledgeIndicatorsTable
                definition={definition.stream}
                knowledgeIndicators={knowledgeIndicators}
                occurrencesByQueryId={occurrencesByQueryId}
                searchTerm={debouncedTableSearchValue}
                selectedTypes={selectedKnowledgeIndicatorTypes}
                statusFilter={knowledgeIndicatorStatusFilter}
                selectedKnowledgeIndicatorId={selectedKnowledgeIndicatorId}
                onViewDetails={toggleSelectedKnowledgeIndicator}
              />
            )}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
      {selectedKnowledgeIndicator ? (
        <KnowledgeIndicatorDetailsFlyout
          knowledgeIndicator={selectedKnowledgeIndicator}
          occurrencesByQueryId={occurrencesByQueryId}
          onClose={() => setSelectedKnowledgeIndicator(null)}
        />
      ) : null}

      {isSuggestedRulesFlyoutOpen && (
        <SuggestedRulesFlyout
          streamName={definition.stream.name}
          onClose={() => setIsSuggestedRulesFlyoutOpen(false)}
        />
      )}
    </>
  );
}

function KnowledgeIndicatorsGenerationControls({
  isGenerating,
  isCanceling,
  isGenerateDisabled,
  onGenerateSuggestionsClick,
  onCancelGenerationClick,
}: {
  isGenerating: boolean;
  isCanceling: boolean;
  isGenerateDisabled: boolean;
  onGenerateSuggestionsClick: () => void;
  onCancelGenerationClick: () => void;
}) {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {isGenerating ? (
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            aria-label={CANCEL_GENERATION_BUTTON_ARIA_LABEL}
            iconType="stop"
            onClick={onCancelGenerationClick}
          />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiButton
          color="primary"
          isLoading={isGenerating}
          isDisabled={isGenerateDisabled}
          onClick={onGenerateSuggestionsClick}
        >
          {isGenerating
            ? isCanceling
              ? CANCELING_BUTTON_LABEL
              : GENERATING_BUTTON_LABEL
            : GENERATE_MORE_BUTTON_LABEL}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
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

const KNOWLEDGE_INDICATORS_TASK_FAILED_TOAST_TITLE = i18n.translate(
  'xpack.streams.significantEventsTable.knowledgeIndicatorsTaskFailedToastTitle',
  {
    defaultMessage: 'Failed to generate knowledge indicators',
  }
);

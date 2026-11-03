/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiCard,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { JOB_TYPE } from '../../../../../common/constants/new_job';
import type { JobSuggestion } from '../../../../../common/types/job_suggestions';
import {
  useMlKibana,
  useMlManagementLocator,
  useNotifications,
} from '../../../../application/contexts/kibana';
import { getWizardPath, stashSuggestion } from '../open_suggestion_in_wizard';
import { DEFAULT_SUGGESTION_TIME_RANGE, useJobSuggestions } from '../use_job_suggestions';
import type { SuggestionTimeRange } from '../use_job_suggestions';

interface Props {
  onClose: () => void;
  indexPattern: string;
  dataViewId?: string;
  savedSearchId?: string;
  projectRouting?: string;
}

const JOB_TYPE_LABELS: Record<JOB_TYPE, string> = {
  [JOB_TYPE.SINGLE_METRIC]: i18n.translate('xpack.ml.suggestADJobsFlyout.jobType.singleMetric', {
    defaultMessage: 'Single metric',
  }),
  [JOB_TYPE.MULTI_METRIC]: i18n.translate('xpack.ml.suggestADJobsFlyout.jobType.multiMetric', {
    defaultMessage: 'Multi-metric',
  }),
  [JOB_TYPE.POPULATION]: i18n.translate('xpack.ml.suggestADJobsFlyout.jobType.population', {
    defaultMessage: 'Population',
  }),
  [JOB_TYPE.ADVANCED]: i18n.translate('xpack.ml.suggestADJobsFlyout.jobType.advanced', {
    defaultMessage: 'Advanced',
  }),
  [JOB_TYPE.CATEGORIZATION]: i18n.translate('xpack.ml.suggestADJobsFlyout.jobType.categorization', {
    defaultMessage: 'Categorization',
  }),
  [JOB_TYPE.RARE]: i18n.translate('xpack.ml.suggestADJobsFlyout.jobType.rare', {
    defaultMessage: 'Rare',
  }),
  [JOB_TYPE.GEO]: i18n.translate('xpack.ml.suggestADJobsFlyout.jobType.geo', {
    defaultMessage: 'Geo',
  }),
};

export const SuggestADJobsFlyout: FC<Props> = ({
  onClose,
  indexPattern,
  dataViewId,
  savedSearchId,
  projectRouting,
}) => {
  const {
    services: {
      data: { dataViews },
    },
  } = useMlKibana();
  const { toasts } = useNotifications();
  const mlManagementLocator = useMlManagementLocator();
  const [timeRange, setTimeRange] = useState<SuggestionTimeRange>(DEFAULT_SUGGESTION_TIME_RANGE);
  const { state, reload } = useJobSuggestions(indexPattern, timeRange);

  const openInWizard = useCallback(
    async (suggestion: JobSuggestion) => {
      try {
        let resolvedDataViewId = dataViewId;
        if (!resolvedDataViewId && !savedSearchId) {
          const matches = await dataViews.find(indexPattern);
          resolvedDataViewId = matches.find(
            (dataView) => dataView.getIndexPattern() === indexPattern
          )?.id;
          if (!resolvedDataViewId) {
            throw new Error(
              i18n.translate('xpack.ml.suggestADJobsFlyout.noDataViewError', {
                defaultMessage:
                  'There is no data view for {indexPattern}. Create one, then try again.',
                values: { indexPattern },
              })
            );
          }
        }

        stashSuggestion(suggestion);
        onClose();
        await mlManagementLocator?.navigate({
          sectionId: 'ml',
          appId: `anomaly_detection${getWizardPath(suggestion, {
            dataViewId: resolvedDataViewId,
            savedSearchId,
            projectRouting,
          })}`,
        });
      } catch (error) {
        toasts.addDanger({
          title: i18n.translate('xpack.ml.suggestADJobsFlyout.openWizardErrorTitle', {
            defaultMessage: 'Could not open the job wizard',
          }),
          text: extractErrorMessage(error),
        });
      }
    },
    [
      dataViewId,
      savedSearchId,
      projectRouting,
      indexPattern,
      dataViews,
      mlManagementLocator,
      onClose,
      toasts,
    ]
  );

  return (
    <>
      <EuiFlyoutHeader hasBorder data-test-subj="mlSuggestADJobsFlyout">
        <EuiTitle size="m">
          <h2 id="ml-flyout-layer-title">
            <FormattedMessage
              id="xpack.ml.suggestADJobsFlyout.title"
              defaultMessage="Suggested anomaly detection jobs"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.ml.suggestADJobsFlyout.subtitle"
            defaultMessage="Jobs which suit the data in {indexPattern}. Select one to review it in a job wizard."
            values={{ indexPattern: <strong>{indexPattern}</strong> }}
          />
        </EuiText>
        <EuiSpacer size="m" />
        <EuiSuperDatePicker
          compressed
          start={timeRange.from}
          end={timeRange.to}
          onTimeChange={({ start, end }) => setTimeRange({ from: start, to: end })}
          onRefresh={reload}
          isDisabled={state.status === 'loading'}
          data-test-subj="mlSuggestADJobsTimeRange"
        />
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {state.status === 'loading' ? (
          <EuiEmptyPrompt
            data-test-subj="mlSuggestADJobsLoading"
            icon={<EuiLoadingSpinner size="xl" />}
            title={
              <h3>
                <FormattedMessage
                  id="xpack.ml.suggestADJobsFlyout.loadingTitle"
                  defaultMessage="Analyzing your data"
                />
              </h3>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.ml.suggestADJobsFlyout.loadingDescription"
                  defaultMessage="This can take up to a minute."
                />
              </p>
            }
          />
        ) : state.status === 'error' ? (
          <KbnDangerCallout
            announceOnMount
            data-test-subj="mlSuggestADJobsError"
            title={i18n.translate('xpack.ml.suggestADJobsFlyout.errorTitle', {
              defaultMessage: 'Could not suggest jobs',
            })}
          >
            {extractErrorMessage(state.error)}
          </KbnDangerCallout>
        ) : state.suggestions.length === 0 ? (
          <EuiEmptyPrompt
            data-test-subj="mlSuggestADJobsEmpty"
            body={
              <p>
                <FormattedMessage
                  id="xpack.ml.suggestADJobsFlyout.emptyDescription"
                  defaultMessage="No suitable jobs were found for this data. Try a different time range."
                />
              </p>
            }
          />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="mlSuggestADJobsList">
            {state.suggestions.map((suggestion) => (
              <EuiFlexItem key={suggestion.id}>
                <EuiCard
                  hasBorder
                  textAlign="left"
                  titleSize="xs"
                  title={suggestion.title}
                  description={suggestion.description}
                  onClick={() => openInWizard(suggestion)}
                  data-test-subj={`mlSuggestADJobsCard-${suggestion.id}`}
                >
                  <EuiSpacer size="s" />
                  <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">{JOB_TYPE_LABELS[suggestion.jobType]}</EuiBadge>
                    </EuiFlexItem>
                    {suggestion.estimatedModelMemoryLimit ? (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow">
                          <FormattedMessage
                            id="xpack.ml.suggestADJobsFlyout.memoryBadge"
                            defaultMessage="Memory: {memory}"
                            values={{ memory: suggestion.estimatedModelMemoryLimit }}
                          />
                        </EuiBadge>
                      </EuiFlexItem>
                    ) : null}
                    {suggestion.validation.status === 'warning' ? (
                      <EuiFlexItem grow={false}>
                        <EuiToolTip
                          content={i18n.translate('xpack.ml.suggestADJobsFlyout.warningTooltip', {
                            defaultMessage:
                              'The job validation found something worth reviewing before the job is created.',
                          })}
                        >
                          <EuiBadge color="warning" tabIndex={0}>
                            <FormattedMessage
                              id="xpack.ml.suggestADJobsFlyout.warningBadge"
                              defaultMessage="Review needed"
                            />
                          </EuiBadge>
                        </EuiToolTip>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </EuiCard>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="mlSuggestADJobsClose">
          <FormattedMessage id="xpack.ml.suggestADJobsFlyout.closeButton" defaultMessage="Close" />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </>
  );
};

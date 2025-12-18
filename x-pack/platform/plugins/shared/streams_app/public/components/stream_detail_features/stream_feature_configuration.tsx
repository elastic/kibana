/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams, Feature } from '@kbn/streams-schema';
import {
  EuiPanel,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiBadge,
  EuiToolTip,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiButtonEmpty,
  EuiButton,
} from '@elastic/eui';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useStreamFeatures } from './stream_features/hooks/use_stream_features';
import { useAIFeatures } from '../../hooks/use_ai_features';
import { useStreamFeaturesApi } from '../../hooks/use_stream_features_api';
import { StreamFeaturesFlyout } from './stream_features/stream_features_flyout';
import { StreamFeaturesAccordion } from './stream_features/stream_features_accordion';
import { Row } from '../data_management/stream_detail_management/advanced_view/row';
import { ConnectorListButton } from '../connector_list_button/connector_list_button';
import { useTaskPolling } from '../../hooks/use_task_polling';

interface StreamConfigurationProps {
  definition: Streams.all.Definition;
}

export function StreamFeatureConfiguration({ definition }: StreamConfigurationProps) {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);
  const {
    getFeatureIdentificationTask,
    scheduleFeatureIdentificationTask,
    cancelFeatureIdentificationTask,
    acknowledgeFeatureIdentificationTask,
  } = useStreamFeaturesApi(definition);
  const aiFeatures = useAIFeatures();
  const [features, setFeatures] = useState<Feature[]>([]);
  const {
    features: existingFeatures,
    refreshFeatures,
    featuresLoading,
  } = useStreamFeatures(definition);

  const [{ loading, value: task, error }, getTask] = useAsyncFn(getFeatureIdentificationTask);
  useEffect(() => {
    getTask();
  }, [getTask]);
  useTaskPolling(task, getFeatureIdentificationTask, getTask);

  function Controls() {
    if (loading) {
      return <EuiLoadingSpinner size="m" />;
    }

    if (error) {
      return (
        <EuiCallOut
          announceOnMount
          title={i18n.translate(
            'xpack.streams.streamDetailView.featureIdentificationLoadingTaskFailedLabel',
            { defaultMessage: 'Failed to load feature identification task status' }
          )}
          color="danger"
          iconType="error"
        >
          {error.message}
        </EuiCallOut>
      );
    }

    if (task === undefined) {
      return null;
    }

    const triggerButton = (
      <ConnectorListButton
        buttonProps={{
          size: 'm',
          iconType: 'sparkles',
          onClick: () => {
            scheduleFeatureIdentificationTask(aiFeatures?.genAiConnectors.selectedConnector!).then(
              () => {
                getTask();
              }
            );
          },
          'data-test-subj': 'feature_identification_identify_features_button',
          children: i18n.translate(
            'xpack.streams.streamDetailView.featureIdentificationButtonLabel',
            {
              defaultMessage: 'Identify features',
            }
          ),
        }}
      />
    );

    if (
      task.status === 'not_started' ||
      task.status === 'acknowledged' ||
      task.status === 'canceled'
    ) {
      return triggerButton;
    }

    if (task.status === 'in_progress') {
      return (
        <EuiFlexGroup>
          <EuiFlexItem>
            <ConnectorListButton
              buttonProps={{
                size: 'm',
                iconType: 'sparkles',
                iconSide: 'right',
                isDisabled: true,
                isLoading: true,
                'data-test-subj': 'feature_identification_identify_features_button',
                children: i18n.translate(
                  'xpack.streams.streamDetailView.featureIdentificationButtonInProgressLabel',
                  {
                    defaultMessage: 'Feature identification in progress',
                  }
                ),
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButtonEmpty
              data-test-subj="feature_identification_cancel_feature_identification_button"
              onClick={() => {
                cancelFeatureIdentificationTask().then(() => {
                  getTask();
                });
              }}
            >
              {i18n.translate(
                'xpack.streams.streamDetailView.cancelFeatureIdentificationButtonLabel',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (task.status === 'being_canceled') {
      return (
        <ConnectorListButton
          buttonProps={{
            size: 'm',
            iconType: 'sparkles',
            iconSide: 'right',
            isDisabled: true,
            isLoading: true,
            'data-test-subj': 'feature_identification_identify_features_button',
            children: i18n.translate(
              'xpack.streams.streamDetailView.featureIdentificationButtonCancellingLabel',
              {
                defaultMessage: 'Canceling feature identification task',
              }
            ),
          }}
        />
      );
    }

    if (task.status === 'completed') {
      if (task.features.length === 0) {
        return (
          <EuiFlexGroup direction="column">
            <EuiFlexItem>{triggerButton}</EuiFlexItem>
            <EuiFlexItem>
              <EuiCallOut
                announceOnMount
                title={i18n.translate('xpack.streams.streamDetailView.noFeaturesIdentifiedTitle', {
                  defaultMessage: 'No features identified',
                })}
                color="primary"
                iconType="search"
              >
                {i18n.translate('xpack.streams.streamDetailView.noFeaturesIdentifiedDescription', {
                  defaultMessage:
                    "The feature identification task didn't find any new features in your data. You can try again with different AI connector settings or try later with new data ingested.",
                })}
              </EuiCallOut>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }

      return (
        <EuiButton
          onClick={() => {
            setFeatures(task.features);
            setIsFlyoutVisible(true);
          }}
          data-test-subj="feature_identification_review_features_button"
        >
          {i18n.translate('xpack.streams.streamDetailView.reviewIdentifiedFeaturesButtonLabel', {
            defaultMessage:
              'Review {count} identified {count, plural, one {feature} other {features}}',
            values: { count: task.features.length },
          })}
        </EuiButton>
      );
    }

    if (task.status === 'failed') {
      return (
        <EuiFlexGroup direction="column">
          <EuiFlexItem>{triggerButton}</EuiFlexItem>
          <EuiFlexItem>
            <EuiCallOut
              announceOnMount
              title={i18n.translate(
                'xpack.streams.streamDetailView.featureIdentificationTaskFailedLabel',
                { defaultMessage: 'Feature identification task failed' }
              )}
              color="danger"
              iconType="error"
            >
              {task.error}
            </EuiCallOut>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (task.status === 'stale') {
      return (
        <EuiFlexGroup direction="column">
          <EuiFlexItem>{triggerButton}</EuiFlexItem>
          <EuiFlexItem>
            <EuiCallOut
              announceOnMount
              title={i18n.translate(
                'xpack.streams.streamDetailView.featureIdentificationTaskStaledLabel',
                { defaultMessage: 'Feature identification task did not complete' }
              )}
              color="warning"
              iconType="warning"
            >
              {i18n.translate(
                'xpack.streams.streamDetailView.featureIdentificationTaskStaledDescription',
                {
                  defaultMessage:
                    "The feature identification task didn't report its status for a prolonged period and is considered stale. Please start a new task.",
                }
              )}
            </EuiCallOut>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
  }

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
      <EuiPanel hasShadow={false} color="subdued">
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiText size="s">
              <h3>
                {i18n.translate('xpack.streams.streamDetailView.configurationTitle', {
                  defaultMessage: 'Feature identification',
                })}
              </h3>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip
              position="top"
              content={i18n.translate(
                'xpack.streams.streamFeatureConfiguration.backgroundTaskTooltipLabel',
                {
                  defaultMessage:
                    'Feature identification runs as a background task. You can start it and come back later to review the results.',
                }
              )}
            >
              <EuiBadge tabIndex={0} iconType="backgroundTask">
                {i18n.translate(
                  'xpack.streams.streamFeatureConfiguration.backgroundTaskBadgeLabel',
                  {
                    defaultMessage: 'Background task',
                  }
                )}
              </EuiBadge>
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiPanel hasShadow={false} hasBorder={false}>
        <EuiFlexGroup direction="column" gutterSize="s">
          <Row
            left={
              <EuiText size="s" color="subdued">
                {i18n.translate('xpack.streams.streamDetailView.configurationDescription', {
                  defaultMessage:
                    'Use AI to generate logical subsets of the data in this stream. You will find useful insights like programming language, operating system, cloud provider etc. This is useful for generating better significant events.',
                })}
              </EuiText>
            }
            right={
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <Controls />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
          {existingFeatures.length > 0 && (
            <>
              <EuiSpacer size="m" />
              <StreamFeaturesAccordion
                definition={definition}
                features={existingFeatures}
                loading={featuresLoading}
                refresh={refreshFeatures}
              />
            </>
          )}
          {isFlyoutVisible && (
            <StreamFeaturesFlyout
              definition={definition}
              features={features}
              setFeatures={setFeatures}
              closeFlyout={() => {
                setIsFlyoutVisible(false);
              }}
              onFeaturesAdded={() => {
                setIsFlyoutVisible(false);
                acknowledgeFeatureIdentificationTask().then(getTask).then(refreshFeatures);
              }}
              onFeaturesDiscarded={() => {
                setIsFlyoutVisible(false);
                acknowledgeFeatureIdentificationTask().then(getTask);
              }}
            />
          )}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  );
}

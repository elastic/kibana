/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { System, Streams } from '@kbn/streams-schema';
import React, { useEffect, useState } from 'react';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { EuiButton, EuiButtonEmpty, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AIFeatures } from '../../hooks/use_ai_features';
import { useStreamFeaturesApi } from '../../hooks/use_stream_features_api';
import { useTaskPolling } from '../../hooks/use_task_polling';
import { StreamFeaturesFlyout } from '../stream_detail_features/stream_features/stream_features_flyout';
import { ConnectorListButton } from '../connector_list_button/connector_list_button';

interface FeatureIdentificationControlProps {
  definition: Streams.all.Definition;
  refreshFeatures: () => void;
  aiFeatures: AIFeatures | null;
  disabled?: boolean;
}

export function FeatureIdentificationControl({
  definition,
  refreshFeatures,
  aiFeatures,
  disabled = false,
}: FeatureIdentificationControlProps) {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  const [features, setFeatures] = useState<System[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    getSystemIdentificationStatus,
    scheduleSystemIdentificationTask,
    cancelSystemIdentificationTask,
    acknowledgeSystemIdentificationTask,
  } = useStreamFeaturesApi(definition);

  const [{ loading, value: task, error }, getTask] = useAsyncFn(getSystemIdentificationStatus);
  useEffect(() => {
    getTask();
  }, [getTask]);
  useTaskPolling(task, getSystemIdentificationStatus, getTask);

  const flyout = isFlyoutVisible && (
    <StreamFeaturesFlyout
      definition={definition}
      features={features}
      setFeatures={setFeatures}
      closeFlyout={() => {
        setIsFlyoutVisible(false);
      }}
      onFeaturesAdded={() => {
        setIsFlyoutVisible(false);
        acknowledgeSystemIdentificationTask().then(getTask).then(refreshFeatures);
      }}
      onFeaturesDiscarded={() => {
        setIsFlyoutVisible(false);
        acknowledgeSystemIdentificationTask().then(getTask);
      }}
    />
  );

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
        isLoading: isLoading || loading,
        isDisabled: disabled,
        onClick: () => {
          setIsLoading(true);
          scheduleSystemIdentificationTask(aiFeatures?.genAiConnectors.selectedConnector!).then(
            () => {
              setIsLoading(false);
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
          <EuiButton
            iconType="sparkle"
            iconSide="right"
            isLoading={true}
            data-test-subj="feature_identification_identify_features_button"
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.featureIdentificationButtonInProgressLabel',
              {
                defaultMessage: 'Feature identification in progress',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonEmpty
            data-test-subj="feature_identification_cancel_feature_identification_button"
            onClick={() => {
              cancelSystemIdentificationTask().then(() => {
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
    if (task.systems.length === 0) {
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
              onDismiss={() => {
                acknowledgeSystemIdentificationTask().then(getTask);
              }}
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
      <>
        <EuiButton
          onClick={() => {
            setFeatures(task.systems);
            setIsFlyoutVisible(true);
          }}
          data-test-subj="feature_identification_review_features_button"
        >
          {i18n.translate('xpack.streams.streamDetailView.reviewIdentifiedFeaturesButtonLabel', {
            defaultMessage:
              'Review {count} identified {count, plural, one {feature} other {features}}',
            values: { count: task.systems.length },
          })}
        </EuiButton>
        {flyout}
      </>
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

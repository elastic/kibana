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
import { useStreamSystemsApi } from '../../hooks/use_stream_systems_api';
import { useTaskPolling } from '../../hooks/use_task_polling';
import { StreamSystemsFlyout } from '../stream_detail_systems/stream_systems/stream_systems_flyout';
import { ConnectorListButtonBase } from '../connector_list_button/connector_list_button';

interface SystemIdentificationControlProps {
  definition: Streams.all.Definition;
  refreshSystems: () => void;
  aiFeatures: AIFeatures | null;
  disabled?: boolean;
}

export function SystemIdentificationControl({
  definition,
  refreshSystems,
  aiFeatures,
  disabled = false,
}: SystemIdentificationControlProps) {
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  const [systems, setSystems] = useState<System[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const {
    getSystemIdentificationStatus,
    scheduleSystemIdentificationTask,
    cancelSystemIdentificationTask,
    acknowledgeSystemIdentificationTask,
  } = useStreamSystemsApi(definition);

  const [{ loading, value: task, error }, getTask] = useAsyncFn(getSystemIdentificationStatus);
  useEffect(() => {
    getTask();
  }, [getTask]);
  useTaskPolling(task, getSystemIdentificationStatus, getTask);

  const flyout = isFlyoutVisible && (
    <StreamSystemsFlyout
      definition={definition}
      systems={systems}
      setSystems={setSystems}
      closeFlyout={() => {
        setIsFlyoutVisible(false);
      }}
      onSystemsAdded={() => {
        setIsFlyoutVisible(false);
        acknowledgeSystemIdentificationTask().then(getTask).then(refreshSystems);
      }}
      onSystemsDiscarded={() => {
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
          'xpack.streams.streamDetailView.systemIdentificationLoadingTaskFailedLabel',
          { defaultMessage: 'Failed to load system identification task status' }
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
    <ConnectorListButtonBase
      aiFeatures={aiFeatures}
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
        'data-test-subj': 'system_identification_identify_systems_button',
        children: i18n.translate('xpack.streams.streamDetailView.systemIdentificationButtonLabel', {
          defaultMessage: 'Identify systems',
        }),
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
            iconSide="left"
            isLoading={true}
            data-test-subj="system_identification_identify_systems_button"
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.systemIdentificationButtonInProgressLabel',
              {
                defaultMessage: 'System identification in progress',
              }
            )}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonEmpty
            data-test-subj="system_identification_cancel_system_identification_button"
            onClick={() => {
              cancelSystemIdentificationTask().then(() => {
                getTask();
              });
            }}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.cancelSystemIdentificationButtonLabel',
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
      <ConnectorListButtonBase
        aiFeatures={aiFeatures}
        buttonProps={{
          size: 'm',
          iconType: 'sparkles',
          iconSide: 'left',
          isDisabled: true,
          isLoading: true,
          'data-test-subj': 'system_identification_identify_systems_button',
          children: i18n.translate(
            'xpack.streams.streamDetailView.systemIdentificationButtonCancellingLabel',
            {
              defaultMessage: 'Canceling system identification task',
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
              title={i18n.translate('xpack.streams.streamDetailView.noSystemsIdentifiedTitle', {
                defaultMessage: 'No systems identified',
              })}
              color="primary"
              iconType="search"
              onDismiss={() => {
                acknowledgeSystemIdentificationTask().then(getTask);
              }}
            >
              {i18n.translate('xpack.streams.streamDetailView.noSystemsIdentifiedDescription', {
                defaultMessage:
                  "The system identification task didn't find any new systems in your data. You can try again with different AI connector settings or try later with new data ingested.",
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
            setSystems(task.systems);
            setIsFlyoutVisible(true);
          }}
          data-test-subj="system_identification_review_systems_button"
        >
          {i18n.translate('xpack.streams.streamDetailView.reviewIdentifiedSystemsButtonLabel', {
            defaultMessage:
              'Review {count} identified {count, plural, one {system} other {systems}}',
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
              'xpack.streams.streamDetailView.systemIdentificationTaskFailedLabel',
              { defaultMessage: 'System identification task failed' }
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
              'xpack.streams.streamDetailView.systemIdentificationTaskStaledLabel',
              { defaultMessage: 'System identification task did not complete' }
            )}
            color="warning"
            iconType="warning"
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.systemIdentificationTaskStaledDescription',
              {
                defaultMessage:
                  "The system identification task didn't report its status for a prolonged period and is considered stale. Please start a new task.",
              }
            )}
          </EuiCallOut>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}

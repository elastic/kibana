/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiModal } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';

import moment from 'moment';
import {
  DataStreamMigrationStatus,
  EnrichedDeprecationInfo,
} from '../../../../../../../common/types';

import { MigrationStateContext } from '../context';

import {
  UIM_DATA_STREAM_START_READONLY_CLICK,
  UIM_DATA_STREAM_STOP_READONLY_CLICK,
  uiMetricService,
} from '../../../../../lib/ui_metric';

import { containerMessages } from './messages';
import type { Step } from './steps/types';
import { InitializingModalStep } from '../../../common/initializing_step';
import { ConfirmMigrationReadonlyFlyoutStep } from './steps/confirm';
import { ChecklistModalStep } from './steps/checklist';
import { MigrationCompletedModalStep } from './steps/completed/completed_step';

interface Props extends MigrationStateContext {
  deprecation: EnrichedDeprecationInfo;
  closeModal: () => void;
}

const DATE_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a';

export const DataStreamReadonlyModal: React.FunctionComponent<Props> = ({
  loadDataStreamMetadata,
  migrationState,
  startReadonly,
  cancelReadonly,
  closeModal,
  deprecation,
}) => {
  const { status, migrationWarnings, errorMessage, resolutionType, meta } = migrationState;
  const [modalStep, setFlyoutStep] = useState<Step>('initializing');
  const { index } = deprecation;

  const switchFlyoutStep = useCallback(() => {
    switch (status) {
      case DataStreamMigrationStatus.notStarted: {
        setFlyoutStep('confirm');
        return;
      }
      case DataStreamMigrationStatus.failed:
      case DataStreamMigrationStatus.fetchFailed:
      case DataStreamMigrationStatus.cancelled:
      case DataStreamMigrationStatus.inProgress: {
        setFlyoutStep('inProgress');
        return;
      }
      case DataStreamMigrationStatus.completed: {
        setTimeout(() => {
          // wait for 1.5 more seconds fur the UI to visually get to 100%
          setFlyoutStep('completed');
        }, 1500);
        return;
      }
    }
  }, [status]);

  useMemo(async () => {
    if (modalStep === 'initializing') {
      await loadDataStreamMetadata();
      switchFlyoutStep();
    }
  }, [modalStep, loadDataStreamMetadata, switchFlyoutStep]);
  useMemo(() => switchFlyoutStep(), [switchFlyoutStep]);

  const onStartReadonly = useCallback(async () => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DATA_STREAM_START_READONLY_CLICK);
    await startReadonly();
  }, [startReadonly]);

  const onStopReadonly = useCallback(async () => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DATA_STREAM_STOP_READONLY_CLICK);
    await cancelReadonly();
  }, [cancelReadonly]);

  const { lastIndexCreationDateFormatted } = useMemo(() => {
    if (!meta) {
      return {
        lastIndexCreationDateFormatted: containerMessages.unknownMessage,
      };
    }

    return {
      lastIndexCreationDateFormatted:
        typeof meta.lastIndexRequiringUpgradeCreationDate === 'number'
          ? `${moment(meta.lastIndexRequiringUpgradeCreationDate).format(DATE_FORMAT)}`
          : 'Unknown',
    };
  }, [meta]);

  const modalContent = useMemo(() => {
    switch (modalStep) {
      case 'initializing':
        return <InitializingModalStep errorMessage={errorMessage} type="dataStream" />;
      case 'confirm': {
        if (!meta || !resolutionType) {
          return (
            <InitializingModalStep
              errorMessage={errorMessage || containerMessages.errorLoadingDataStreamInfo}
              type="dataStream"
            />
          );
        }

        return (
          <ConfirmMigrationReadonlyFlyoutStep
            warnings={(migrationWarnings ?? []).filter(
              (warning) => warning.resolutionType === resolutionType
            )}
            meta={meta}
            closeModal={closeModal}
            startAction={() => onStartReadonly()}
            lastIndexCreationDateFormatted={lastIndexCreationDateFormatted}
          />
        );
      }
      case 'inProgress': {
        if (!resolutionType) {
          return (
            <InitializingModalStep
              errorMessage={errorMessage || containerMessages.errorLoadingDataStreamInfo}
              type="dataStream"
            />
          );
        }

        return (
          <ChecklistModalStep
            closeModal={closeModal}
            executeAction={() => {
              setFlyoutStep('confirm');
            }}
            migrationState={migrationState}
            cancelAction={() => onStopReadonly()}
            dataStreamName={index}
          />
        );
      }
      case 'completed': {
        return (
          <MigrationCompletedModalStep
            meta={meta}
            resolutionType={resolutionType}
            close={closeModal}
            dataStreamName={index}
          />
        );
      }
    }
  }, [
    modalStep,
    errorMessage,
    meta,
    resolutionType,
    migrationWarnings,
    closeModal,
    lastIndexCreationDateFormatted,
    onStartReadonly,
    migrationState,
    index,
    onStopReadonly,
  ]);

  return (
    <EuiModal
      onClose={closeModal}
      data-test-subj="updateIndexModal"
      maxWidth={true}
      css={{ minWidth: 750 }}
    >
      {modalContent}
    </EuiModal>
  );
};

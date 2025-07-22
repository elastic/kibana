/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiModal } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';

import moment from 'moment';
import { EnrichedDeprecationInfo } from '../../../../../../../common/types';

import { MigrationStateContext } from '../context';

import {
  UIM_DATA_STREAM_START_READONLY_CLICK,
  UIM_DATA_STREAM_STOP_READONLY_CLICK,
  uiMetricService,
} from '../../../../../lib/ui_metric';

import { containerMessages } from './messages';
import { InitializingStep } from '../../../common/initializing_step';
import { ConfirmMigrationReadonlyFlyoutStep } from './steps/confirm';
import { ChecklistModalStep } from './steps/checklist';
import { MigrationCompletedModalStep } from './steps/completed/completed_step';
import { useMigrationStep } from '../use_migration_step';
import { DeleteModal } from '../../../common/delete_step_modal';

interface Props extends MigrationStateContext {
  deprecation: EnrichedDeprecationInfo;
  closeModal: () => void;
  modalType: 'readonly' | 'delete';
}

const DATE_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a';

export const DataStreamReadonlyModal: React.FunctionComponent<Props> = ({
  loadDataStreamMetadata,
  migrationState,
  startReadonly,
  cancelReadonly,
  closeModal,
  startDelete,
  deprecation,
  modalType,
}) => {
  const { status, migrationWarnings, errorMessage, resolutionType, meta } = migrationState;
  const [modalStep, setModalStep] = useMigrationStep(status, loadDataStreamMetadata, modalType);
  const { index } = deprecation;

  const onStartReadonly = useCallback(async () => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DATA_STREAM_START_READONLY_CLICK);
    await startReadonly();
  }, [startReadonly]);

  const onStopReadonly = useCallback(async () => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DATA_STREAM_STOP_READONLY_CLICK);
    await cancelReadonly();
  }, [cancelReadonly]);

  const onDeleteIndex = useCallback(async () => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DATA_STREAM_STOP_READONLY_CLICK);
    await startDelete();
  }, [startDelete]);

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
        return <InitializingStep errorMessage={errorMessage} type="dataStream" mode="modal" />;
      case 'confirmDelete':
        return (
          <DeleteModal
            closeModal={closeModal}
            targetName={index}
            deleteIndex={onDeleteIndex}
            type="dataStream"
          />
        );
      case 'confirm': {
        if (!meta || !resolutionType) {
          return (
            <InitializingStep
              errorMessage={errorMessage || containerMessages.errorLoadingDataStreamInfo}
              type="dataStream"
              mode="modal"
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
            <InitializingStep
              errorMessage={errorMessage || containerMessages.errorLoadingDataStreamInfo}
              type="dataStream"
              mode="modal"
            />
          );
        }

        return (
          <ChecklistModalStep
            closeModal={closeModal}
            executeAction={() => {
              setModalStep('confirm');
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
    closeModal,
    errorMessage,
    index,
    lastIndexCreationDateFormatted,
    meta,
    migrationState,
    migrationWarnings,
    modalStep,
    onStartReadonly,
    onStopReadonly,
    resolutionType,
    setModalStep,
    onDeleteIndex,
  ]);

  return (
    <EuiModal
      onClose={closeModal}
      data-test-subj="updateDataStreamModal"
      maxWidth={true}
      css={{ minWidth: 750 }}
    >
      {modalContent}
    </EuiModal>
  );
};

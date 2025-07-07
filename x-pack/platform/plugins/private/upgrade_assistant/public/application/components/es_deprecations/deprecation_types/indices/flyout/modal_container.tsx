/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';

import { EuiModal } from '@elastic/eui';
import { IndicesResolutionType } from '../../../../../../../common/types';

import type { IndexStateContext } from '../context';
import {
  UIM_REINDEX_READONLY_CLICK,
  UIM_REINDEX_READONLY_RETRY_CLICK,
  UIM_REINDEX_UNFREEZE_CLICK,
  UIM_REINDEX_UNFREEZE_RETRY_CLICK,
  uiMetricService,
} from '../../../../../lib/ui_metric';
import { ModalStep } from './steps/types';
import { InitializingStep } from '../../../common/initializing_step';
import { UpdateIndexModalStep } from './steps/update/update_step';
import { WarningModalStep } from './steps/warning/warning_step_modal';

export interface IndexModalProps extends IndexStateContext {
  closeModal: () => void;
  selectedResolutionType: IndicesResolutionType | undefined;
}

export const IndexModal: React.FunctionComponent<IndexModalProps> = ({
  reindexState,
  updateIndexState,
  updateIndex,
  closeModal,
  deprecation,
  selectedResolutionType,
}) => {
  const { status: reindexStatus, errorMessage } = reindexState;
  const { status: updateIndexStatus } = updateIndexState;
  const { correctiveAction } = deprecation;

  const [modalStep, setModalStep] = useState<ModalStep>('initializing');

  const onMakeReadonly = useCallback(async () => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_REINDEX_READONLY_CLICK);
    await updateIndex();
  }, [updateIndex]);

  const onMakeReadonlyRetry = useCallback(async () => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_REINDEX_READONLY_RETRY_CLICK);
    await updateIndex();
  }, [updateIndex]);

  const onUnfreeze = useCallback(async () => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_REINDEX_UNFREEZE_CLICK);
    await updateIndex();
  }, [updateIndex]);

  const onUnfreezeRetry = useCallback(async () => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_REINDEX_UNFREEZE_RETRY_CLICK);
    await updateIndex();
  }, [updateIndex]);

  useEffect(() => {
    switch (updateIndexStatus) {
      case 'inProgress':
      case 'complete':
      case 'failed': {
        setModalStep(correctiveAction?.type === 'unfreeze' ? 'unfreeze' : 'makeReadonly');
        break;
      }
      default: {
        switch (selectedResolutionType) {
          case 'readonly': {
            setModalStep('confirmReadonly');
            break;
          }
          case 'unfreeze':
            setModalStep('confirmUnfreeze');
            break;
          default: {
            setModalStep('initializing');
            break;
          }
        }
      }
    }
  }, [
    correctiveAction?.type,
    onUnfreeze,
    reindexStatus,
    selectedResolutionType,
    updateIndexStatus,
  ]);

  const modalContent = useMemo(() => {
    switch (modalStep) {
      case 'initializing':
        return <InitializingStep errorMessage={errorMessage} type="index" mode="modal" />;
      case 'confirmReadonly':
      case 'confirmUnfreeze':
        return (
          <WarningModalStep
            warnings={
              modalStep === 'confirmReadonly'
                ? reindexState.reindexWarnings?.filter(
                    ({ flow: warningFlow }) => warningFlow === 'readonly'
                  ) ?? []
                : []
            }
            meta={reindexState.meta}
            closeModal={closeModal}
            confirm={() => {
              if (modalStep === 'confirmReadonly') {
                setModalStep('makeReadonly');
                onMakeReadonly();
              } else {
                setModalStep('unfreeze');
                onUnfreeze();
              }
            }}
            deprecation={deprecation}
            reindexState={reindexState}
            flow={modalStep === 'confirmReadonly' ? 'readonly' : 'unfreeze'}
          />
        );
      case 'unfreeze':
        return (
          <UpdateIndexModalStep
            action={modalStep}
            meta={reindexState.meta}
            retry={onUnfreezeRetry}
            updateIndexState={updateIndexState}
            closeModal={closeModal}
          />
        );
      case 'makeReadonly':
        return (
          <UpdateIndexModalStep
            action={modalStep}
            meta={reindexState.meta}
            retry={onMakeReadonlyRetry}
            updateIndexState={updateIndexState}
            closeModal={closeModal}
          />
        );
    }
  }, [
    modalStep,
    errorMessage,
    reindexState,
    closeModal,
    deprecation,
    onUnfreezeRetry,
    updateIndexState,
    onMakeReadonlyRetry,
    onMakeReadonly,
    onUnfreeze,
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

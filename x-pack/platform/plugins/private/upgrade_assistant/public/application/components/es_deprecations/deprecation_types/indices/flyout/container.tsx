/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlyoutHeader, EuiSpacer, EuiTitle } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';

import {
  EnrichedDeprecationInfo,
  IndicesResolutionType,
  ReindexStatus,
} from '../../../../../../../common/types';

import type { IndexStateContext } from '../context';
import { DeprecationBadge, WarningLevels } from '../../../../shared';
import {
  UIM_REINDEX_READONLY_CLICK,
  UIM_REINDEX_READONLY_RETRY_CLICK,
  UIM_REINDEX_START_CLICK,
  UIM_REINDEX_STOP_CLICK,
  UIM_REINDEX_UNFREEZE_CLICK,
  UIM_REINDEX_UNFREEZE_RETRY_CLICK,
  uiMetricService,
} from '../../../../../lib/ui_metric';
import {
  UpdateIndexFlyoutStep,
  ReindexFlyoutStep,
  WarningFlyoutStep,
  type FlyoutStep,
} from './steps';
import { InitializingFlyoutStep } from './steps/initializing/initializing_step';

export interface IndexFlyoutProps extends IndexStateContext {
  deprecation: EnrichedDeprecationInfo;
  closeFlyout: () => void;
  selectedResolutionType: IndicesResolutionType | undefined;
}

export const IndexFlyout: React.FunctionComponent<IndexFlyoutProps> = ({
  reindexState,
  startReindex,
  cancelReindex,
  updateIndexState,
  updateIndex,
  closeFlyout,
  deprecation,
  selectedResolutionType,
}) => {
  const { status: reindexStatus, reindexWarnings, errorMessage } = reindexState;
  const { status: updateIndexStatus } = updateIndexState;
  const { index, correctiveAction } = deprecation;

  const [flyoutStep, setFlyoutStep] = useState<FlyoutStep>('initializing');

  const onStartReindex = useCallback(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_REINDEX_START_CLICK);
    startReindex();
  }, [startReindex]);

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

  const onStopReindex = useCallback(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_REINDEX_STOP_CLICK);
    cancelReindex();
  }, [cancelReindex]);

  useEffect(() => {
    switch (reindexStatus) {
      case ReindexStatus.failed: {
        if (updateIndexStatus === 'complete' || updateIndexStatus === 'inProgress') {
          setFlyoutStep(correctiveAction?.type === 'unfreeze' ? 'unfreeze' : 'makeReadonly');
          break;
        }
      }
      case ReindexStatus.fetchFailed:
      case ReindexStatus.cancelled:
      case ReindexStatus.inProgress:
      case ReindexStatus.completed: {
        setFlyoutStep('reindexing');
        break;
      }
      default: {
        switch (updateIndexStatus) {
          case 'inProgress':
          case 'complete':
          case 'failed': {
            setFlyoutStep(correctiveAction?.type === 'unfreeze' ? 'unfreeze' : 'makeReadonly');
            break;
          }
          default: {
            switch (selectedResolutionType) {
              case 'readonly': {
                setFlyoutStep('confirmReadonly');
                break;
              }
              case 'reindex': {
                setFlyoutStep('confirmReindex');
                break;
              }
              case 'unfreeze':
                setFlyoutStep('unfreeze');
                onUnfreeze();
                break;
              default: {
                setFlyoutStep('initializing');
                break;
              }
            }
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

  const startReindexWithWarnings = useCallback(() => {
    if (
      reindexWarnings &&
      reindexWarnings.length > 0 &&
      reindexStatus !== ReindexStatus.inProgress &&
      reindexStatus !== ReindexStatus.completed
    ) {
      setFlyoutStep('confirmReindex');
    } else {
      onStartReindex();
    }
  }, [reindexWarnings, reindexStatus, onStartReindex]);

  const flyoutContents = useMemo(() => {
    switch (flyoutStep) {
      case 'initializing':
        return <InitializingFlyoutStep errorMessage={errorMessage} />;
      case 'confirmReadonly':
      case 'confirmReindex':
        const flow = flyoutStep === 'confirmReadonly' ? 'readonly' : 'reindex';
        return (
          <WarningFlyoutStep
            warnings={
              reindexState.reindexWarnings?.filter(
                ({ flow: warningFlow }) => warningFlow === 'all' || warningFlow === flow
              ) ?? []
            }
            meta={reindexState.meta}
            flow={flow}
            closeFlyout={closeFlyout}
            confirm={() => {
              if (flyoutStep === 'confirmReadonly') {
                setFlyoutStep('makeReadonly');
                onMakeReadonly();
              } else {
                onStartReindex();
              }
            }}
            deprecation={deprecation}
            reindexState={reindexState}
          />
        );
      case 'reindexing':
        return (
          <ReindexFlyoutStep
            closeFlyout={closeFlyout}
            startReindex={startReindexWithWarnings}
            reindexState={reindexState}
            cancelReindex={onStopReindex}
          />
        );
      case 'unfreeze':
        return (
          <UpdateIndexFlyoutStep
            action={flyoutStep}
            meta={reindexState.meta}
            retry={onUnfreezeRetry}
            updateIndexState={updateIndexState}
            closeFlyout={closeFlyout}
          />
        );
      case 'makeReadonly':
        return (
          <UpdateIndexFlyoutStep
            action={flyoutStep}
            meta={reindexState.meta}
            retry={onMakeReadonlyRetry}
            updateIndexState={updateIndexState}
            closeFlyout={closeFlyout}
          />
        );
    }
  }, [
    flyoutStep,
    errorMessage,
    reindexState,
    closeFlyout,
    startReindexWithWarnings,
    onStopReindex,
    onUnfreezeRetry,
    updateIndexState,
    onMakeReadonlyRetry,
    onMakeReadonly,
    onStartReindex,
    deprecation,
  ]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <DeprecationBadge
          level={deprecation.level as WarningLevels}
          isResolved={reindexStatus === ReindexStatus.completed || updateIndexStatus === 'complete'}
        />
        <EuiSpacer size="s" />
        <EuiTitle size="s" data-test-subj="flyoutTitle">
          <h2 id="reindexDetailsFlyoutTitle">
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.flyoutHeader"
              defaultMessage="Update {index}"
              values={{ index }}
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      {flyoutContents}
    </>
  );
};

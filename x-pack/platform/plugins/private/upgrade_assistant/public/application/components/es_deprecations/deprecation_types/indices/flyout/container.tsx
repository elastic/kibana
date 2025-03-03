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

import { EnrichedDeprecationInfo, ReindexStatus } from '../../../../../../../common/types';

import type { IndexStateContext } from '../context';
import { DeprecationBadge } from '../../../../shared';
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
  ReindexDetailsFlyoutStep,
  UnfreezeDetailsFlyoutStep,
  UpdateIndexFlyoutStep,
  ReindexFlyoutStep,
  WarningFlyoutStep,
  type FlyoutStep,
} from './steps';

export interface IndexFlyoutProps extends IndexStateContext {
  deprecation: EnrichedDeprecationInfo;
  closeFlyout: () => void;
}

export const IndexFlyout: React.FunctionComponent<IndexFlyoutProps> = ({
  reindexState,
  startReindex,
  cancelReindex,
  updateIndexState,
  updateIndex,
  closeFlyout,
  deprecation,
}) => {
  const { status: reindexStatus, reindexWarnings } = reindexState;
  const { status: updateIndexStatus } = updateIndexState;
  const { index, correctiveAction } = deprecation;

  const [flyoutStep, setFlyoutStep] = useState<FlyoutStep>('details');

  useEffect(() => {
    switch (reindexStatus) {
      case ReindexStatus.failed:
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
            setFlyoutStep('details');
            break;
          }
        }
      }
    }
  }, [correctiveAction?.type, reindexStatus, updateIndexStatus]);

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
      case 'details':
        return correctiveAction?.type === 'unfreeze' ? (
          // we will show specific unfreeze details/flow for:
          // A) 7.x indices that are frozen AND read-only (should be an edge case)
          <UnfreezeDetailsFlyoutStep
            closeFlyout={closeFlyout}
            startReindex={() => {
              setFlyoutStep('confirmReindex');
            }}
            unfreeze={() => {
              setFlyoutStep('unfreeze');
              onUnfreeze();
            }}
            updateIndexState={updateIndexState}
            reindexState={reindexState}
          />
        ) : (
          // we will show specific reindex details/flow for:
          // B) 7.x indices that are frozen AND NOT read-only (should be the most common scenario)
          // C) 7.x indices that are not frozen
          //    C.1) if they are read-only => this will be a WARNING deprecation
          //    C.2) if they are NOT read-only => this will be a CRITICAL deprecation
          <ReindexDetailsFlyoutStep
            closeFlyout={closeFlyout}
            startReindex={() => {
              setFlyoutStep('confirmReindex');
            }}
            startReadonly={() => {
              setFlyoutStep('confirmReadonly');
            }}
            deprecation={deprecation}
            updateIndexState={updateIndexState}
            reindexState={reindexState}
          />
        );
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
            back={() => setFlyoutStep('details')}
            confirm={() => {
              if (flyoutStep === 'confirmReadonly') {
                setFlyoutStep('makeReadonly');
                onMakeReadonly();
              } else {
                onStartReindex();
              }
            }}
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
    correctiveAction?.type,
    deprecation,
    closeFlyout,
    updateIndexState,
    reindexState,
    startReindexWithWarnings,
    onStopReindex,
    onUnfreezeRetry,
    onMakeReadonlyRetry,
    onUnfreeze,
    onMakeReadonly,
    onStartReindex,
  ]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <DeprecationBadge
          isCritical={deprecation.isCritical}
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

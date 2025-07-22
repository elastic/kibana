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
  UIM_REINDEX_START_CLICK,
  UIM_REINDEX_STOP_CLICK,
  uiMetricService,
} from '../../../../../lib/ui_metric';
import { InitializingStep } from '../../../common/initializing_step';
import { WarningFlyoutStep } from './steps/warning/warning_step';
import { ReindexFlyoutStep } from './steps/reindex/reindex_step';
import { FlyoutStep } from './steps/types';

export interface IndexFlyoutProps extends IndexStateContext {
  deprecation: EnrichedDeprecationInfo;
  closeFlyout: () => void;
}

export const IndexFlyout: React.FunctionComponent<IndexFlyoutProps> = ({
  reindexState,
  startReindex,
  cancelReindex,
  updateIndexState,
  closeFlyout,
  deprecation,
}) => {
  const { status: reindexStatus, reindexWarnings, errorMessage } = reindexState;
  const { status: updateIndexStatus } = updateIndexState;
  const { index } = deprecation;

  const [flyoutStep, setFlyoutStep] = useState<FlyoutStep>('initializing');

  const onStartReindex = useCallback(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_REINDEX_START_CLICK);
    startReindex();
  }, [startReindex]);

  const onStopReindex = useCallback(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_REINDEX_STOP_CLICK);
    cancelReindex();
  }, [cancelReindex]);

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
        setFlyoutStep('confirmReindex');
        break;
      }
    }
  }, [reindexStatus]);

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
        return <InitializingStep errorMessage={errorMessage} type="index" mode="flyout" />;
      case 'confirmReindex':
        return (
          <WarningFlyoutStep
            warnings={
              reindexState.reindexWarnings?.filter(
                ({ flow: warningFlow }) => warningFlow === 'all' || warningFlow === 'reindex'
              ) ?? []
            }
            meta={reindexState.meta}
            closeFlyout={closeFlyout}
            confirm={() => {
              onStartReindex();
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
    }
  }, [
    closeFlyout,
    deprecation,
    errorMessage,
    flyoutStep,
    onStartReindex,
    onStopReindex,
    reindexState,
    startReindexWithWarnings,
  ]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <DeprecationBadge
          level={deprecation.level}
          isResolved={reindexStatus === ReindexStatus.completed || updateIndexStatus === 'complete'}
        />
        <EuiSpacer size="s" />
        <EuiTitle size="s" data-test-subj="flyoutTitle">
          <h2 id="reindexDetailsFlyoutTitle">
            <FormattedMessage
              id="xpack.upgradeAssistant.esDeprecations.indices.indexFlyout.flyoutHeader"
              defaultMessage="Reindex {index}"
              values={{ index }}
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      {flyoutContents}
    </>
  );
};

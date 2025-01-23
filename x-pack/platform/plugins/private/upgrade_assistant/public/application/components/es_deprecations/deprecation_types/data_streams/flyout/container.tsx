/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';

import moment from 'moment';
import numeral from '@elastic/numeral';
import { EnrichedDeprecationInfo, ReindexStatus } from '../../../../../../../common/types';

import type { ReindexStateContext } from '../context';

import { DeprecationBadge } from '../../../../shared';
import {
  UIM_DATA_STREAM_REINDEX_START_CLICK,
  UIM_DATA_STREAM_REINDEX_STOP_CLICK,
  uiMetricService,
} from '../../../../../lib/ui_metric';

import type { FlyoutStep } from './steps/types';

import { InitializingFlyoutStep } from './steps/initializing';
import { ConfirmReindexingFlyoutStep } from './steps/confirm';
import { DataStreamDetailsFlyoutStep } from './steps/details';
import { ChecklistFlyoutStep } from './steps/checklist';
import { ReindexingCompletedFlyoutStep } from './steps/completed';

interface Props extends ReindexStateContext {
  deprecation: EnrichedDeprecationInfo;
  closeFlyout: () => void;
}

const DATE_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a';
const FILE_SIZE_DISPLAY_FORMAT = '0,0.[0] b';

export const DataStreamReindexFlyout: React.FunctionComponent<Props> = ({
  reindexState,
  startReindex,
  cancelReindex,
  closeFlyout,
  deprecation,
}) => {
  const { status, reindexWarnings, meta } = reindexState;
  const { index } = deprecation;
  console.log('meta::', meta);
  console.log('reindexState::', reindexState);

  const [flyoutStep, setFlyoutStep] = useState<FlyoutStep>('initializing');

  const onStartReindex = useCallback(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DATA_STREAM_REINDEX_START_CLICK);
    setFlyoutStep('inProgress');
    startReindex();
  }, [startReindex]);

  useMemo(() => {
    switch (status) {
      case ReindexStatus.failed:
      case ReindexStatus.paused:
      case ReindexStatus.fetchFailed:
      case ReindexStatus.cancelled:
      case ReindexStatus.inProgress: {
        setFlyoutStep('inProgress');
        return;
      }
      case ReindexStatus.completed: {
        setFlyoutStep('completed');
        return;
      }
      default: {
        setFlyoutStep('notStarted');
        return;
      }
    }
  }, [status]);

  const onStopReindex = useCallback(() => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DATA_STREAM_REINDEX_STOP_CLICK);
    setFlyoutStep('notStarted');
    cancelReindex();
  }, [cancelReindex]);

  const { docsSizeFormatted, lastIndexCreationDateFormatted } = useMemo(() => {
    return {
      docsSizeFormatted: meta.dataStreamDocSize
        ? numeral(meta.dataStreamDocSize).format(FILE_SIZE_DISPLAY_FORMAT)
        : 'Unknown',
      lastIndexCreationDateFormatted: meta.lastIndexCreationDate
        ? `${moment(meta.lastIndexCreationDate).format(DATE_FORMAT)}`
        : 'Unknown',
    };
  }, [meta]);

  const flyoutContents = useMemo(() => {
    switch (flyoutStep) {
      case 'initializing':
        return <InitializingFlyoutStep />;
      case 'notStarted':
        return (
          <DataStreamDetailsFlyoutStep
            closeFlyout={closeFlyout}
            lastIndexCreationDateFormatted={lastIndexCreationDateFormatted}
            meta={meta}
            startReindex={() => {
              setFlyoutStep('confirm');
            }}
            reindexState={reindexState}
            cancelReindex={onStopReindex}
          />
        );
      case 'confirm':
        return (
          <ConfirmReindexingFlyoutStep
            warnings={reindexWarnings ?? []}
            meta={reindexState.meta}
            hideWarningsStep={() => {
              setFlyoutStep('notStarted');
            }}
            continueReindex={() => {
              onStartReindex();
            }}
          />
        );
      case 'inProgress':
        return (
          <ChecklistFlyoutStep
            closeFlyout={closeFlyout}
            startReindex={() => {
              setFlyoutStep('confirm');
            }}
            reindexState={reindexState}
            cancelReindex={onStopReindex}
          />
        );

      case 'completed':
        return <ReindexingCompletedFlyoutStep />;
    }
  }, [flyoutStep, reindexState]);

  return (
    <>
      {flyoutStep !== 'initializing' && (
        <EuiFlyoutHeader hasBorder>
          <DeprecationBadge
            isCritical={deprecation.isCritical}
            isResolved={status === ReindexStatus.completed}
          />
          <EuiSpacer size="s" />
          <EuiTitle size="s" data-test-subj="flyoutTitle">
            <h2 id="reindexDetailsFlyoutTitle">{index}</h2>
          </EuiTitle>
          <EuiSpacer size="m" />
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiDescriptionList
                textStyle="reverse"
                listItems={[
                  {
                    title: 'Reindexing required for indices created on or after',
                    description: `${lastIndexCreationDateFormatted}`,
                  },
                ]}
              />
            </EuiFlexItem>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiDescriptionList
                  textStyle="reverse"
                  listItems={[
                    {
                      title: 'Size',
                      description: `${docsSizeFormatted}`,
                    },
                  ]}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiDescriptionList
                  textStyle="reverse"
                  listItems={[
                    {
                      title: 'Document Count',
                      description: meta.dataStreamDocCount
                        ? `${meta.dataStreamDocCount}`
                        : 'Unknown',
                    },
                  ]}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
      )}

      {flyoutContents}
    </>
  );
};

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
import { i18n } from '@kbn/i18n';
import {
  DataStreamMigrationStatus,
  DataStreamsAction,
  EnrichedDeprecationInfo,
} from '../../../../../../../common/types';

import { MigrationStateContext } from '../context';

import { DeprecationBadge } from '../../../../shared';
import {
  UIM_DATA_STREAM_REINDEX_START_CLICK,
  UIM_DATA_STREAM_REINDEX_STOP_CLICK,
  UIM_DATA_STREAM_START_READONLY_CLICK,
  UIM_DATA_STREAM_STOP_READONLY_CLICK,
  uiMetricService,
} from '../../../../../lib/ui_metric';

import { containerMessages } from './messages';
import type { FlyoutStep } from './steps/types';
import { InitializingFlyoutStep } from './steps/initializing';
import { ConfirmMigrationFlyoutStep } from './steps/confirm';
import { DataStreamDetailsFlyoutStep } from './steps/details';
import { ChecklistFlyoutStep } from './steps/checklist';
import { MigrationCompletedFlyoutStep } from './steps/completed';

interface Props extends MigrationStateContext {
  deprecation: EnrichedDeprecationInfo;
  closeFlyout: () => void;
}

const DATE_FORMAT = 'dddd, MMMM Do YYYY, h:mm:ss a';
const FILE_SIZE_DISPLAY_FORMAT = '0,0.[0] b';

export const DataStreamReindexFlyout: React.FunctionComponent<Props> = ({
  cancelReindex,
  loadDataStreamMetadata,
  migrationState,
  startReindex,
  startReadonly,
  initMigration,
  cancelReadonly,
  closeFlyout,
  deprecation,
}) => {
  const { status, migrationWarnings, errorMessage, resolutionType, meta } = migrationState;
  const { index, correctiveAction } = deprecation;
  const [flyoutStep, setFlyoutStep] = useState<FlyoutStep>('initializing');

  const switchFlyoutStep = useCallback(() => {
    switch (status) {
      case DataStreamMigrationStatus.notStarted: {
        setFlyoutStep('notStarted');
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
    if (flyoutStep === 'initializing') {
      await loadDataStreamMetadata();
      switchFlyoutStep();
    }
  }, [loadDataStreamMetadata, switchFlyoutStep, flyoutStep]);
  useMemo(() => switchFlyoutStep(), [switchFlyoutStep]);

  const onStartReindex = useCallback(async () => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DATA_STREAM_REINDEX_START_CLICK);
    await startReindex();
  }, [startReindex]);

  const onStartReadonly = useCallback(async () => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DATA_STREAM_START_READONLY_CLICK);
    await startReadonly();
  }, [startReadonly]);

  const onStopReindex = useCallback(async () => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DATA_STREAM_REINDEX_STOP_CLICK);
    await cancelReindex();
  }, [cancelReindex]);

  const onStopReadonly = useCallback(async () => {
    uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, UIM_DATA_STREAM_STOP_READONLY_CLICK);
    await cancelReadonly();
  }, [cancelReadonly]);

  const {
    docsSizeFormatted,
    indicesRequiringUpgradeDocsCount,
    lastIndexCreationDateFormatted,
    oldestIncompatibleDocFormatted,
  } = useMemo(() => {
    if (!meta) {
      return {
        indicesRequiringUpgradeDocsCount: containerMessages.unknownMessage,
        docsSizeFormatted: containerMessages.unknownMessage,
        lastIndexCreationDateFormatted: containerMessages.unknownMessage,
        oldestIncompatibleDocFormatted: undefined,
      };
    }

    return {
      indicesRequiringUpgradeDocsCount:
        typeof meta.indicesRequiringUpgradeDocsCount === 'number'
          ? `${meta.indicesRequiringUpgradeDocsCount}`
          : 'Unknown',
      docsSizeFormatted:
        typeof meta.indicesRequiringUpgradeDocsSize === 'number'
          ? numeral(meta.indicesRequiringUpgradeDocsSize).format(FILE_SIZE_DISPLAY_FORMAT)
          : 'Unknown',
      lastIndexCreationDateFormatted:
        typeof meta.lastIndexRequiringUpgradeCreationDate === 'number'
          ? `${moment(meta.lastIndexRequiringUpgradeCreationDate).format(DATE_FORMAT)}`
          : 'Unknown',
      oldestIncompatibleDocFormatted:
        typeof meta.oldestIncompatibleDocTimestamp === 'number'
          ? `${moment(meta.oldestIncompatibleDocTimestamp).format(DATE_FORMAT)}`
          : undefined,
    };
  }, [meta]);

  const flyoutContents = useMemo(() => {
    switch (flyoutStep) {
      case 'initializing':
        return <InitializingFlyoutStep errorMessage={errorMessage} />;
      case 'notStarted': {
        if (!meta) {
          return (
            <InitializingFlyoutStep
              errorMessage={errorMessage || containerMessages.errorLoadingDataStreamInfo}
            />
          );
        }

        return (
          <DataStreamDetailsFlyoutStep
            correctiveAction={correctiveAction as DataStreamsAction}
            closeFlyout={closeFlyout}
            initAction={(selectedResolutionType) => {
              initMigration(selectedResolutionType);
              setFlyoutStep('confirm');
            }}
            lastIndexCreationDateFormatted={lastIndexCreationDateFormatted}
            meta={meta}
            migrationState={migrationState}
          />
        );
      }
      case 'confirm': {
        if (!meta || !resolutionType) {
          return (
            <InitializingFlyoutStep
              errorMessage={errorMessage || containerMessages.errorLoadingDataStreamInfo}
            />
          );
        }

        return (
          <ConfirmMigrationFlyoutStep
            warnings={(migrationWarnings ?? []).filter(
              (warning) => warning.resolutionType === resolutionType
            )}
            meta={meta}
            resolutionType={resolutionType}
            hideWarningsStep={() => {
              setFlyoutStep('notStarted');
            }}
            startAction={() => {
              if (resolutionType === 'readonly') {
                onStartReadonly();
              } else {
                onStartReindex();
              }
            }}
          />
        );
      }
      case 'inProgress': {
        if (!meta || !resolutionType) {
          return (
            <InitializingFlyoutStep
              errorMessage={errorMessage || containerMessages.errorLoadingDataStreamInfo}
            />
          );
        }

        return (
          <ChecklistFlyoutStep
            closeFlyout={closeFlyout}
            executeAction={() => {
              setFlyoutStep('confirm');
            }}
            resolutionType={resolutionType}
            migrationState={migrationState}
            cancelAction={() => {
              if (resolutionType === 'readonly') {
                onStopReadonly();
              } else {
                onStopReindex();
              }
            }}
            startReadonly={startReadonly}
            correctiveAction={correctiveAction as DataStreamsAction}
          />
        );
      }
      case 'completed': {
        return (
          <MigrationCompletedFlyoutStep
            meta={meta}
            resolutionType={resolutionType}
            closeFlyout={closeFlyout}
          />
        );
      }
    }
  }, [
    flyoutStep,
    migrationState,
    closeFlyout,
    onStartReindex,
    onStopReindex,
    lastIndexCreationDateFormatted,
    migrationWarnings,
    meta,
    errorMessage,
    onStartReadonly,
    onStopReadonly,
    resolutionType,
    initMigration,
    correctiveAction,
    startReadonly,
  ]);

  return (
    <>
      {flyoutStep !== 'initializing' && (
        <EuiFlyoutHeader hasBorder>
          <DeprecationBadge
            level={deprecation.level}
            isResolved={status === DataStreamMigrationStatus.completed}
          />
          <EuiSpacer size="s" />
          <EuiTitle size="s" data-test-subj="flyoutTitle">
            <h2 id="reindexDetailsFlyoutTitle">{index}</h2>
          </EuiTitle>
          {meta && (
            <>
              <EuiSpacer size="m" />
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem>
                  <EuiDescriptionList
                    textStyle="reverse"
                    data-test-subj="dataStreamLastIndexCreationDate"
                    listItems={
                      oldestIncompatibleDocFormatted
                        ? [
                            {
                              title: i18n.translate(
                                'xpack.upgradeAssistant.dataStream.flyout.container.oldestIncompatibleDoc',
                                {
                                  defaultMessage:
                                    'Migration required for data indexed on or before',
                                }
                              ),
                              description: oldestIncompatibleDocFormatted,
                            },
                          ]
                        : [
                            {
                              title: i18n.translate(
                                'xpack.upgradeAssistant.dataStream.flyout.container.affectedIndicesCreatedOnOrBefore',
                                {
                                  defaultMessage:
                                    'Migration required for indices created on or before',
                                }
                              ),
                              description: lastIndexCreationDateFormatted,
                            },
                          ]
                    }
                  />
                </EuiFlexItem>
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiDescriptionList
                      textStyle="reverse"
                      listItems={[
                        {
                          title: i18n.translate(
                            'xpack.upgradeAssistant.dataStream.flyout.container.indicesDocsSize',
                            {
                              defaultMessage: 'Size',
                            }
                          ),
                          description: docsSizeFormatted,
                        },
                      ]}
                      data-test-subj="dataStreamSize"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiDescriptionList
                      textStyle="reverse"
                      listItems={[
                        {
                          title: i18n.translate(
                            'xpack.upgradeAssistant.dataStream.flyout.container.indicesDocsCount',
                            {
                              defaultMessage: 'Document Count',
                            }
                          ),
                          description: indicesRequiringUpgradeDocsCount,
                        },
                      ]}
                      data-test-subj="dataStreamDocumentCount"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexGroup>
            </>
          )}
        </EuiFlyoutHeader>
      )}

      {flyoutContents}
    </>
  );
};

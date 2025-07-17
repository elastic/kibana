/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import {
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import {
  DataStreamMigrationStatus,
  DataStreamResolutionType,
  DataStreamsAction,
} from '../../../../../../common/types';
import { getDataStreamReindexProgressLabel } from '../../../../lib/utils';
import { LoadingState } from '../../../types';
import { useDataStreamMigrationContext } from './context';

const getI18nTexts = (resolutionType?: DataStreamResolutionType) => {
  return {
    loadingStatusText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionLoadingStatusText',
      {
        defaultMessage: 'Loading status…',
      }
    ),
    resolutionInProgressText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionInProgressText',
      {
        defaultMessage:
          '{resolutionType, select, reindex {Reindexing} readonly {Setting to read-only} delete {Deleting} other {Migration}} in progress…',
        values: { resolutionType },
      }
    ),
    resolutionCompleteText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionCompleteText',
      {
        defaultMessage:
          '{resolutionType, select, reindex {Reindexing} readonly {Setting to read-only} delete {Deleting} other {Migration}} complete',
        values: { resolutionType },
      }
    ),
    resolutionFailedText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resulutionFailedText',
      {
        defaultMessage:
          '{resolutionType, select, reindex {Reindexing} readonly {Setting to read-only} delete {Deleting} other {Migration}} failed',
        values: { resolutionType },
      }
    ),
    resolutionFetchFailedText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionFetchFailedText',
      {
        defaultMessage:
          '{resolutionType, select, reindex {Reindexing} readonly {Setting to read-only} delete {Deleting} other {Migration}} status not available',
        values: { resolutionType },
      }
    ),
    reindexCanceledText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionCanceledText',
      {
        defaultMessage:
          '{resolutionType, select, reindex {Reindexing} readonly {Setting to read-only} delete {Deleting} other {Migration}} cancelled',
        values: { resolutionType },
      }
    ),
    recommendedActionTexts: {
      readonly: {
        text: i18n.translate(
          'xpack.upgradeAssistant.esDeprecations.dataStream.recommendedActionReadonlyText',
          {
            defaultMessage: 'Recommended: set to read-only',
          }
        ),
        tooltipText: i18n.translate(
          'xpack.upgradeAssistant.esDeprecations.dataStream.recommendedActionReadonlyTooltipText',
          {
            defaultMessage:
              'If you do not need to update historical data, set it to read-only. You can reindex post-upgrade if updates are needed.',
          }
        ),
      },
      reindex: {
        text: i18n.translate(
          'xpack.upgradeAssistant.esDeprecations.dataStream.recommendedActionReindexText',
          {
            defaultMessage: 'Recommended: reindex',
          }
        ),
        tooltipText: i18n.translate(
          'xpack.upgradeAssistant.esDeprecations.dataStream.recommendedActionReindexTooltipText',
          {
            defaultMessage:
              'The current write index will be rolled over and reindexed. Additional backing indices will be reindexed and remain editable.',
          }
        ),
      },
    },
  };
};

export const DataStreamReindexResolutionCell: React.FunctionComponent<{
  correctiveAction: DataStreamsAction;
}> = ({ correctiveAction }) => {
  const { migrationState } = useDataStreamMigrationContext();
  const i18nTexts = getI18nTexts(migrationState.resolutionType);

  // The suggested option for data streams by default is always 'readonly' unless is excluded from the corrective action.
  const recommendedAction: DataStreamResolutionType =
    correctiveAction.metadata.excludedActions?.includes('readOnly') ? 'reindex' : 'readonly';

  if (migrationState.loadingState === LoadingState.Loading) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <em>{i18nTexts.loadingStatusText}</em>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  switch (migrationState.status) {
    case DataStreamMigrationStatus.inProgress:
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <em>
                {i18nTexts.resolutionInProgressText}{' '}
                {getDataStreamReindexProgressLabel(
                  migrationState.status,
                  migrationState.taskPercComplete
                )}
              </em>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case DataStreamMigrationStatus.completed:
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="checkInCircleFilled" color="success" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.resolutionCompleteText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case DataStreamMigrationStatus.failed:
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="warningFilled" color="danger" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.resolutionFailedText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case DataStreamMigrationStatus.fetchFailed:
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="warningFilled" color="danger" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.resolutionFetchFailedText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    default:
      if (recommendedAction) {
        return (
          <EuiText size="s" color="subdued">
            <em>
              {i18nTexts.recommendedActionTexts[recommendedAction].text}{' '}
              <EuiToolTip
                position="top"
                content={i18nTexts.recommendedActionTexts[recommendedAction].tooltipText}
              >
                <EuiIcon
                  type="info"
                  aria-label={i18nTexts.recommendedActionTexts[recommendedAction].tooltipText}
                  size="s"
                />
              </EuiToolTip>
            </em>
          </EuiText>
        );
      }
      return <></>;
  }
};

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

const getI18nTexts = (
  resolutionType?: DataStreamResolutionType,
  excludedActions: Array<'readOnly' | 'reindex'> = []
) => {
  const resolutionAction = excludedActions.includes('readOnly')
    ? 'reindex'
    : excludedActions.includes('reindex')
    ? 'readOnly'
    : 'readOnlyOrReindex';

  const resolutionTexts = {
    readOnlyOrReindex: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionReadOnlyOrReindexLabel',
      {
        defaultMessage: 'Mark as read-only, or reindex',
      }
    ),
    readOnly: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionReadOnlyLabel',
      {
        defaultMessage: 'Mark as read-only',
      }
    ),
    reindex: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionReindexLabel',
      {
        defaultMessage: 'Reindex',
      }
    ),
  };

  const resolutionTooltipLabels = {
    readOnlyOrReindex: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionTooltipReadOnlyOrReindexLabel',
      {
        defaultMessage:
          'Resolve this issue by reindexing this data stream or marking its indices as read-only. This issue can be resolved automatically.',
      }
    ),
    readOnly: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionTooltipReadOnlyLabel',
      {
        defaultMessage:
          'Resolve this issue by marking its indices as read-only. This issue can be resolved automatically.',
      }
    ),
    reindex: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionTooltipReindexLabel',
      {
        defaultMessage:
          'Resolve this issue by reindexing this data stream. This issue can be resolved automatically.',
      }
    ),
  };

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
          '{resolutionType, select, reindex {Reindexing} readonly {Marking as read-only} other {Migration}} in progress…',
        values: { resolutionType },
      }
    ),
    resolutionCompleteText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionCompleteText',
      {
        defaultMessage:
          '{resolutionType, select, reindex {Reindexing} readonly {Marking as read-only} other {Migration}} complete',
        values: { resolutionType },
      }
    ),
    resolutionFailedText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resulutionFailedText',
      {
        defaultMessage:
          '{resolutionType, select, reindex {Reindexing} readonly {Marking as read-only} other {Migration}} failed',
        values: { resolutionType },
      }
    ),
    resolutionFetchFailedText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionFetchFailedText',
      {
        defaultMessage:
          '{resolutionType, select, reindex {Reindexing} readonly {Marking as read-only} other {Migration}} status not available',
        values: { resolutionType },
      }
    ),
    reindexCanceledText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionCanceledText',
      {
        defaultMessage:
          '{resolutionType, select, reindex {Reindexing} readonly {Marking as read-only} other {Migration}} cancelled',
        values: { resolutionType },
      }
    ),
    resolutionText: resolutionTexts[resolutionAction],
    resolutionTooltipLabel: resolutionTooltipLabels[resolutionAction],
  };
};

export const DataStreamReindexResolutionCell: React.FunctionComponent<{
  correctiveAction: DataStreamsAction;
}> = ({ correctiveAction }) => {
  const { migrationState } = useDataStreamMigrationContext();
  const i18nTexts = getI18nTexts(
    migrationState.resolutionType,
    correctiveAction.metadata.excludedActions
  );

  if (migrationState.loadingState === LoadingState.Loading) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18nTexts.loadingStatusText}</EuiText>
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
            <EuiText size="s">
              {i18nTexts.resolutionInProgressText}{' '}
              {getDataStreamReindexProgressLabel(
                migrationState.status,
                migrationState.taskPercComplete
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case DataStreamMigrationStatus.completed:
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="check" color="success" />
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
            <EuiIcon type="warning" color="danger" />
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
            <EuiIcon type="warning" color="danger" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.resolutionFetchFailedText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    default:
      return (
        <EuiToolTip position="top" content={i18nTexts.resolutionTooltipLabel}>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="indexSettings" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{i18nTexts.resolutionText}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiToolTip>
      );
  }
};

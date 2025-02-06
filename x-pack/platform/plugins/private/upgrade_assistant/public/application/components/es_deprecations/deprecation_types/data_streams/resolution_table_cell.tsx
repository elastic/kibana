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
} from '../../../../../../common/types';
import { getDataStreamReindexProgressLabel } from '../../../../lib/utils';
import { LoadingState } from '../../../types';
import { useDataStreamMigrationContext } from './context';

const getI18nTexts = (resolutionType?: DataStreamResolutionType) => {
  return {
    reindexLoadingStatusText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.reindexLoadingStatusText',
      {
        defaultMessage: 'Loading status…',
      }
    ),
    reindexInProgressText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.reindexInProgressText',
      {
        defaultMessage:
          '{resolutionType, select, reindex {Reindexing} readonly {Marking as readonly} other {Migration}} in progress…',
        values: { resolutionType },
      }
    ),
    reindexCompleteText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.reindexCompleteText',
      {
        defaultMessage:
          '{resolutionType, select, reindex {Reindexing} readonly {Marking as readonly} other {Migration}} complete',
        values: { resolutionType },
      }
    ),
    reindexFailedText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.reindexFailedText',
      {
        defaultMessage:
          '{resolutionType, select, reindex {Reindexing} readonly {Marking as readonly} other {Migration}} failed',
        values: { resolutionType },
      }
    ),
    reindexFetchFailedText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.reindexFetchFailedText',
      {
        defaultMessage:
          '{resolutionType, select, reindex {Reindexing} readonly {Marking as readonly} other {Migration}} status not available',
        values: { resolutionType },
      }
    ),
    reindexCanceledText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.reindexCanceledText',
      {
        defaultMessage:
          '{resolutionType, select, reindex {Reindexing} readonly {Marking as readonly} other {Migration}} cancelled',
        values: { resolutionType },
      }
    ),
    resolutionText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionLabel',
      {
        defaultMessage: 'Mark as readonly, or Reindex',
      }
    ),
    resolutionTooltipLabel: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionTooltipLabel',
      {
        defaultMessage:
          'Resolve this issue by reindexing this data stream or marking its indices as readonly. This issue can be resolved automatically.',
      }
    ),
  };
};

export const DataStreamReindexResolutionCell: React.FunctionComponent = () => {
  const { migrationState } = useDataStreamMigrationContext();

  if (migrationState.loadingState === LoadingState.Loading) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            {getI18nTexts(migrationState.resolutionType).reindexLoadingStatusText}
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
            <EuiText size="s">
              {getI18nTexts(migrationState.resolutionType).reindexInProgressText}{' '}
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
            <EuiText size="s">
              {getI18nTexts(migrationState.resolutionType).reindexCompleteText}
            </EuiText>
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
            <EuiText size="s">
              {getI18nTexts(migrationState.resolutionType).reindexFailedText}
            </EuiText>
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
            <EuiText size="s">
              {getI18nTexts(migrationState.resolutionType).reindexFetchFailedText}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    default:
      return (
        <EuiToolTip
          position="top"
          content={getI18nTexts(migrationState.resolutionType).resolutionTooltipLabel}
        >
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="indexSettings" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                {getI18nTexts(migrationState.resolutionType).resolutionText}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiToolTip>
      );
  }
};

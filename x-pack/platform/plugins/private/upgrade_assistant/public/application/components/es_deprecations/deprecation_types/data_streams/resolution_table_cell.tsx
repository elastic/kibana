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
import { DataStreamReindexStatus } from '../../../../../../common/types';
import { getDataStreamReindexProgressLabel } from '../../../../lib/utils';
import { LoadingState } from '../../../types';
import { useDataStreamReindexContext } from './context';

const getI18nTexts = (resolutionType?: 'readonly' | 'reindex') => {
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
          '{resolutionType, select, reindexing {Reindexing} readonly {Marking as readonly} other {Migration}} in progress…',
        values: { resolutionType },
      }
    ),
    reindexCompleteText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.reindexCompleteText',
      {
        defaultMessage:
          '{resolutionType, select, reindexing {Reindexing} readonly {Marking as readonly} other {Migration}} complete',
        values: { resolutionType },
      }
    ),
    reindexFailedText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.reindexFailedText',
      {
        defaultMessage:
          '{resolutionType, select, reindexing {Reindexing} readonly {Marking as readonly} other {Migration}} failed',
        values: { resolutionType },
      }
    ),
    reindexFetchFailedText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.reindexFetchFailedText',
      {
        defaultMessage:
          '{resolutionType, select, reindexing {Reindexing} readonly {Marking as readonly} other {Migration}} status not available',
        values: { resolutionType },
      }
    ),
    reindexCanceledText: i18n.translate(
      'xpack.upgradeAssistant.esDeprecations.dataStream.reindexCanceledText',
      {
        defaultMessage:
          '{resolutionType, select, reindexing {Reindexing} readonly {Marking as readonly} other {Migration}} cancelled',
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
          'Resolve this issue by reindexing this data stream. This issue can be resolved automatically.',
        values: { resolutionType },
      }
    ),
  };
};

export const DataStreamReindexResolutionCell: React.FunctionComponent = () => {
  const { migrationState } = useDataStreamReindexContext();

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
    case DataStreamReindexStatus.inProgress:
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
                migrationState.reindexTaskPercComplete
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case DataStreamReindexStatus.completed:
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
    case DataStreamReindexStatus.failed:
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
    case DataStreamReindexStatus.fetchFailed:
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

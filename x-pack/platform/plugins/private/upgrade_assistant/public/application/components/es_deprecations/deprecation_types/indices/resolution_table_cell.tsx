/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EuiIcon, EuiLoadingSpinner, EuiText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ReindexStatus } from '../../../../../../common/types';
import { getReindexProgressLabel } from '../../../../lib/utils';
import { LoadingState } from '../../../types';
import { useIndexContext } from './context';

const i18nTexts = {
  reindexLoadingStatusText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.reindexLoadingStatusText',
    {
      defaultMessage: 'Loading status…',
    }
  ),
  reindexInProgressText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.reindexInProgressText',
    {
      defaultMessage: 'Reindexing in progress…',
    }
  ),
  reindexCompleteText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.reindexCompleteText',
    {
      defaultMessage: 'Reindex complete',
    }
  ),
  reindexFailedText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.reindexFailedText',
    {
      defaultMessage: 'Reindex failed',
    }
  ),
  reindexFetchFailedText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.reindexFetchFailedText',
    {
      defaultMessage: 'Reindex status not available',
    }
  ),
  reindexPausedText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.reindexPausedText',
    {
      defaultMessage: 'Reindex paused',
    }
  ),
  updateCompleteText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.updateCompleteText',
    {
      defaultMessage: 'Update complete',
    }
  ),
};

export const ReindexResolutionCell: React.FunctionComponent = () => {
  const { reindexState, updateIndexState } = useIndexContext();
  const hasExistingAliases = reindexState.meta.aliases.length > 0;

  if (reindexState.loadingState === LoadingState.Loading) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18nTexts.reindexLoadingStatusText}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  switch (reindexState.status) {
    case ReindexStatus.inProgress:
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              {i18nTexts.reindexInProgressText}{' '}
              {getReindexProgressLabel(
                reindexState.reindexTaskPercComplete,
                reindexState.lastCompletedStep,
                hasExistingAliases
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case ReindexStatus.completed:
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="checkInCircleFilled" color="success" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.reindexCompleteText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case ReindexStatus.failed:
      if (updateIndexState.status !== 'complete') {
        return (
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiIcon type="warningFilled" color="danger" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{i18nTexts.reindexFailedText}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }
      break;
    case ReindexStatus.fetchFailed:
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="warningFilled" color="danger" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.reindexFetchFailedText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case ReindexStatus.paused:
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="warningFilled" color="danger" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.reindexPausedText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
  }

  switch (updateIndexState.status) {
    case 'complete':
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="checkInCircleFilled" color="success" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.updateCompleteText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
  }

  return <></>;
};

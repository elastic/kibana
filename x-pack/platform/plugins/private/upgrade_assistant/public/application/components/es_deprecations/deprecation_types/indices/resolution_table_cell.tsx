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
import { ReindexStatus } from '../../../../../../common/types';
import { getReindexProgressLabel } from '../../../../lib/utils';
import { LoadingState } from '../../../types';
import { useIndexContext } from './context';

const i18nTexts = {
  reindexLoadingStatusText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.reindexLoadingStatusText',
    {
      defaultMessage: 'Loading status…',
    }
  ),
  reindexInProgressText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.reindexInProgressText',
    {
      defaultMessage: 'Reindexing in progress…',
    }
  ),
  reindexCompleteText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.reindexCompleteText',
    {
      defaultMessage: 'Reindex complete',
    }
  ),
  reindexFailedText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.reindexFailedText',
    {
      defaultMessage: 'Reindex failed',
    }
  ),
  reindexFetchFailedText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.reindexFetchFailedText',
    {
      defaultMessage: 'Reindex status not available',
    }
  ),
  reindexCanceledText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.reindexCanceledText',
    {
      defaultMessage: 'Reindex cancelled',
    }
  ),
  reindexPausedText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.reindexPausedText',
    {
      defaultMessage: 'Reindex paused',
    }
  ),
  reindexText: i18n.translate('xpack.upgradeAssistant.esDeprecations.reindex.reindexLabel', {
    defaultMessage: 'Reindex',
  }),
  reindexTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.reindexTooltipLabel',
    {
      defaultMessage: 'Resolve this issue by reindexing into a new, compatible index.',
    }
  ),
  updateText: i18n.translate('xpack.upgradeAssistant.esDeprecations.reindex.updateLabel', {
    defaultMessage: 'Update',
  }),
  updateCompleteText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.updateCompleteText',
    {
      defaultMessage: 'Update complete',
    }
  ),
  updateTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.updateTooltipLabel',
    {
      defaultMessage:
        'Resolve this issue by updating this index. This issue can be resolved automatically either by making the index read-only (recommended for large indices) or by reindexing into a new, compatible index.',
    }
  ),
  unfreezeText: i18n.translate('xpack.upgradeAssistant.esDeprecations.reindex.unfreezeLabel', {
    defaultMessage: 'Unfreeze',
  }),
  unfreezeTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.reindex.unfreezeTooltipLabel',
    {
      defaultMessage: 'Resolve this issue by unfreezing this index.',
    }
  ),
};

export const ReindexResolutionCell: React.FunctionComponent = () => {
  const { reindexState, deprecation, updateIndexState } = useIndexContext();
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
            <EuiIcon type="check" color="success" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.reindexCompleteText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case ReindexStatus.failed:
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="warning" color="danger" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.reindexFailedText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case ReindexStatus.fetchFailed:
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="warning" color="danger" />
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
            <EuiIcon type="warning" color="danger" />
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
            <EuiIcon type="check" color="success" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.updateCompleteText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
  }

  // reindex status "not started"
  return deprecation.correctiveAction?.type === 'unfreeze' ? (
    <EuiToolTip position="top" content={i18nTexts.unfreezeTooltipLabel}>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="indexSettings" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18nTexts.unfreezeText}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  ) : reindexState.meta.isReadonly ? (
    <EuiToolTip position="top" content={i18nTexts.reindexTooltipLabel}>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="indexSettings" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18nTexts.reindexText}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  ) : (
    <EuiToolTip position="top" content={i18nTexts.updateTooltipLabel}>
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="indexSettings" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18nTexts.updateText}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
};

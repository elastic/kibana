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
  EnrichedDeprecationInfo,
  ReindexAction,
  ReindexStatus,
} from '../../../../../../common/types';
import { getReindexProgressLabel } from '../../../../lib/utils';
import { LoadingState } from '../../../types';
import { useIndexContext } from './context';

type RecommendedActionType =
  | 'unfreeze'
  | 'isLargeIndex'
  | 'isFollowerIndex'
  | 'isReadonly'
  | 'readonly'
  | 'reindex';

const recommendedReadOnlyText = i18n.translate(
  'xpack.upgradeAssistant.esDeprecations.dataStream.recommendedActionReadonlyText',
  {
    defaultMessage: 'Recommended to set to read-only',
  }
);
const recommendedReindexText = i18n.translate(
  'xpack.upgradeAssistant.esDeprecations.dataStream.recommendedActionReindexText',
  {
    defaultMessage: 'Recommended to reindex',
  }
);

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
  recommendedActionTexts: {
    isLargeIndex: {
      text: recommendedReadOnlyText,
      tooltipText: i18n.translate(
        'xpack.upgradeAssistant.esDeprecations.dataStream.recommendedActionReadonlyReasonIsLargeIndex',
        {
          defaultMessage:
            'This index is larger than 1GB. Reindexing large indices can take a long time. If you no longer need to update documents in this index (or add new ones), you might want to convert it to a read-only index.',
        }
      ),
    },
    isFollowerIndex: {
      text: recommendedReadOnlyText,
      tooltipText: i18n.translate(
        'xpack.upgradeAssistant.esDeprecations.dataStream.recommendedActionReadonlyReasonIsFollowerIndex',
        {
          defaultMessage:
            'This index is a cross-cluster replication follower index, which should not be reindexed. You can mark it as read-only or terminate the replication and convert it to a standard index.',
        }
      ),
    },
    readonly: {
      text: recommendedReadOnlyText,
      tooltipText: i18n.translate(
        'xpack.upgradeAssistant.esDeprecations.dataStream.recommendedActionReadonlyReasonReadonly',
        {
          defaultMessage:
            'Old indices can maintain compatibility with the next major version if they are turned into read-only mode. If you no longer need to update documents in this index (or add new ones), you might want to convert it to a read-only index.',
        }
      ),
    },
    isReadonly: {
      text: recommendedReindexText,
      tooltipText: i18n.translate(
        'xpack.upgradeAssistant.esDeprecations.dataStream.recommendedActionReindexReasonReadonly',
        {
          defaultMessage: 'This index is already read-only. You can still reindex it.',
        }
      ),
    },
    reindex: {
      text: recommendedReindexText,
      tooltipText: i18n.translate(
        'xpack.upgradeAssistant.esDeprecations.dataStream.recommendedActionReindexTooltipText',
        {
          defaultMessage:
            'The reindex operation allows transforming an index into a new, compatible one. It will copy all of the existing documents into a new index and remove the old one. Depending on size and resources, reindexing may take extended time and your data will be in a read-only state until the job has completed.',
        }
      ),
    },
    unfreeze: {
      text: i18n.translate(
        'xpack.upgradeAssistant.esDeprecations.dataStream.recommendedOptionUnfreezeText',
        {
          defaultMessage: 'Recommended to unfreeze',
        }
      ),
      tooltipText: i18n.translate(
        'xpack.upgradeAssistant.esDeprecations.dataStream.recommendedOptionReadonlyReasonFreeze',
        {
          defaultMessage:
            'To ensure compatibility with the next major version, unfreeze is recommended. It will also be set as read-only.',
        }
      ),
    },
  },
};

export const ReindexResolutionCell: React.FunctionComponent<{
  deprecation: EnrichedDeprecationInfo;
}> = ({ deprecation }) => {
  const { reindexState, updateIndexState } = useIndexContext();
  const { correctiveAction } = deprecation;

  const hasExistingAliases = reindexState.meta.aliases.length > 0;

  const getRecommendedActionForUnfreezeAction = (): RecommendedActionType => {
    // Unfreeze is always the Recommended action for frozen index
    return 'unfreeze';
  };

  const getRecommendedActionForReindexingAction = (): RecommendedActionType => {
    const { meta } = reindexState;
    const { isReadonly, isFollowerIndex } = meta;
    const { excludedActions = [], indexSizeInBytes = 0 } =
      (deprecation.correctiveAction as ReindexAction) || {};

    // Determine if the index is larger than 1GB
    const isLargeIndex = indexSizeInBytes > 1073741824;
    const readOnlyExcluded = excludedActions.includes('readOnly');
    const reindexExcluded = excludedActions.includes('reindex');

    if (isFollowerIndex && !readOnlyExcluded) {
      // If the index is a follower index, recommend setting it to read-only
      return 'isFollowerIndex';
    } else if (isLargeIndex && !readOnlyExcluded) {
      // If the index is larger than 1GB, recommend setting it to read-only
      return 'isLargeIndex';
    } else if (isReadonly) {
      // If the index is already read-only, recommend reindexing
      return 'isReadonly';
    } else if (reindexExcluded) {
      // If reindexing is excluded, recommend setting it to read-only
      return 'readonly';
    } else {
      // Reindex is the default recommended action unless other conditions apply
      return 'reindex';
    }
  };

  const recommendedAction =
    correctiveAction?.type === 'unfreeze'
      ? getRecommendedActionForUnfreezeAction()
      : getRecommendedActionForReindexingAction();

  if (reindexState.loadingState === LoadingState.Loading) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            <em>{i18nTexts.reindexLoadingStatusText}</em>
          </EuiText>
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
            <EuiText size="s" color="subdued">
              <em>
                {i18nTexts.reindexInProgressText}{' '}
                {getReindexProgressLabel(
                  reindexState.reindexTaskPercComplete,
                  reindexState.lastCompletedStep,
                  hasExistingAliases
                )}
              </em>
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
              type="iInCircle"
              aria-label={i18nTexts.recommendedActionTexts[recommendedAction].tooltipText}
            />
          </EuiToolTip>
        </em>
      </EuiText>
    );
  }
  return <></>;
};

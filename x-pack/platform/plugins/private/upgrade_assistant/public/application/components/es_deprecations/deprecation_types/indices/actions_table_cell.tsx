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
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiLink,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { useIndexContext } from './context';
import { LoadingState } from '../../../types';

const i18nTexts = {
  reindexLoadingActionsText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.reindexLoadingActionsText',
    {
      defaultMessage: 'Loading actions…',
    }
  ),
  reindexText: i18n.translate('xpack.upgradeAssistant.esDeprecations.indices.reindexLabel', {
    defaultMessage: 'Reindex',
  }),
  reindexFollowerIndexText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.reindexFollowerIndexLabel',
    {
      defaultMessage: 'Unfollow leader index',
    }
  ),
  reindexTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.reindexTooltipLabel',
    {
      defaultMessage: 'Resolve this issue by reindexing into a new, compatible index.',
    }
  ),
  reindexFollowerIndexTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.reindexFollowerIndexTooltipLabel',
    {
      defaultMessage: 'Resolve this issue by terminating replication.',
    }
  ),
  updateText: i18n.translate('xpack.upgradeAssistant.esDeprecations.indices.updateLabel', {
    defaultMessage: 'Update',
  }),
  updateTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.updateTooltipLabel',
    {
      defaultMessage:
        'Resolve this issue by updating this index. This issue can be resolved automatically either by marking the index as read-only (recommended for large indices) or by reindexing into a new, compatible index.',
    }
  ),
  unfreezeText: i18n.translate('xpack.upgradeAssistant.esDeprecations.indices.unfreezeLabel', {
    defaultMessage: 'Unfreeze',
  }),
  unfreezeTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.unfreezeTooltipLabel',
    {
      defaultMessage: 'Resolve this issue by unfreezing this index.',
    }
  ),
};

const getAction = (
  correctiveActionType: string | undefined,
  tooltipLabel: string,
  actionText: string,
  openFlyout: () => void
) => {
  return (
    <EuiToolTip position="top" content={tooltipLabel}>
      <EuiLink data-test-subj={`deprecation-${correctiveActionType}`} onClick={openFlyout}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="indexSettings" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{actionText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiLink>
    </EuiToolTip>
  );
};

interface Props {
  openFlyout: () => void;
}

export const ReindexActionCell: React.FunctionComponent<Props> = ({ openFlyout }) => {
  const { reindexState, deprecation } = useIndexContext();

  if (reindexState.loadingState === LoadingState.Loading) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{i18nTexts.reindexLoadingActionsText}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // reindex status "not started"
  return deprecation.correctiveAction?.type === 'unfreeze' ? (
    getAction('unfreeze', i18nTexts.unfreezeTooltipLabel, i18nTexts.unfreezeText, openFlyout)
  ) : reindexState.meta.isReadonly ? (
    <>
      {reindexState.meta.isFollowerIndex
        ? getAction(
            deprecation.correctiveAction?.type,
            i18nTexts.reindexFollowerIndexTooltipLabel,
            i18nTexts.reindexFollowerIndexText,
            openFlyout
          )
        : getAction(
            deprecation.correctiveAction?.type,
            i18nTexts.reindexTooltipLabel,
            i18nTexts.reindexText,
            openFlyout
          )}
    </>
  ) : (
    getAction(
      deprecation.correctiveAction?.type,
      i18nTexts.updateTooltipLabel,
      i18nTexts.updateText,
      openFlyout
    )
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiText, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import {
  IndicesResolutionType,
  ReindexAction,
  ReindexStatus,
  UnfreezeAction,
} from '../../../../../../common/types';
import { useIndexContext } from './context';
import { LoadingState } from '../../../types';
import { ActionButtonConfig, ActionButtons } from '../../common/action_buttons';

const actionsI18nTexts = {
  reindexLoadingActionsText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.reindexLoadingActionsText',
    {
      defaultMessage: 'Loading actions…',
    }
  ),
  reindexTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.reindexTooltipLabel',
    {
      defaultMessage: 'Resolve this issue by reindexing into a new, compatible index.',
    }
  ),
  readOnlyTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.readOnlyTooltipLabel',
    {
      defaultMessage: 'Resolve this issue by setting this index to read-only.',
    }
  ),
  unfreezeTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.indices.unfreezeTooltipLabel',
    {
      defaultMessage: 'Resolve this issue by unfreezing this index.',
    }
  ),
};

const UnfreezeActionButtons: React.FunctionComponent<{
  openFlyout: () => void;
  openModal: () => void;
  correctiveAction: UnfreezeAction;
  setSelectedResolutionType: (step: Exclude<IndicesResolutionType, 'readonly'>) => void;
}> = ({ openFlyout, correctiveAction, setSelectedResolutionType, openModal }) => {
  const { reindexState, updateIndexState } = useIndexContext();
  const reindexingInProgressOrCompleted =
    reindexState.status === ReindexStatus.inProgress ||
    reindexState.status === ReindexStatus.completed;
  const updateInProgressOrCompleted =
    updateIndexState.status === 'complete' || updateIndexState.status === 'inProgress';
  const canDisplayUnfreeze = !!(
    reindexState.hasRequiredPrivileges && !reindexingInProgressOrCompleted
  );
  const canDisplayReindex = !!(reindexState.hasRequiredPrivileges && !updateInProgressOrCompleted);
  const actions: ActionButtonConfig[] = [
    {
      tooltip: actionsI18nTexts.reindexTooltipLabel,
      iconType: 'indexSettings',
      canDisplay: canDisplayReindex,
      resolutionType: 'reindex',
      onClick: () => {
        openFlyout();
      },
    },
    {
      tooltip: actionsI18nTexts.unfreezeTooltipLabel,
      iconType: 'readOnly',
      canDisplay: canDisplayUnfreeze,
      resolutionType: 'unfreeze',
      onClick: () => {
        openModal();
        setSelectedResolutionType('unfreeze');
      },
    },
  ];
  return <ActionButtons actions={actions} dataTestSubjPrefix={correctiveAction.type} />;
};

const ReindexActionButtons: React.FunctionComponent<{
  openFlyout: () => void;
  openModal: () => void;
  correctiveAction: ReindexAction;
  setSelectedResolutionType: (step: Exclude<IndicesResolutionType, 'unfreeze'>) => void;
}> = ({ openFlyout, correctiveAction, setSelectedResolutionType, openModal }) => {
  const { excludedActions = [] } = correctiveAction;
  const { reindexState, updateIndexState } = useIndexContext();
  const { meta } = reindexState;
  const { isReadonly, isFollowerIndex } = meta;
  const reindexingInProgressOrCompleted =
    reindexState.status === ReindexStatus.inProgress ||
    reindexState.status === ReindexStatus.completed;
  const updateInProgressOrCompleted =
    updateIndexState.status === 'complete' || updateIndexState.status === 'inProgress';
  const readOnlyExcluded = excludedActions.includes('readOnly');
  const reindexExcluded = excludedActions.includes('reindex');
  const canDisplayReadOnly = !!(
    reindexState.hasRequiredPrivileges &&
    !readOnlyExcluded &&
    !isReadonly &&
    !reindexingInProgressOrCompleted
  );
  const canDisplayReindex = !!(
    reindexState.hasRequiredPrivileges &&
    !reindexExcluded &&
    !isFollowerIndex &&
    !updateInProgressOrCompleted
  );
  const actions: ActionButtonConfig[] = [
    {
      tooltip: actionsI18nTexts.reindexTooltipLabel,
      iconType: 'indexSettings',
      canDisplay: canDisplayReindex,
      resolutionType: 'reindex',
      onClick: () => {
        openFlyout();
      },
    },
    {
      tooltip: actionsI18nTexts.readOnlyTooltipLabel,
      iconType: 'readOnly',
      canDisplay: canDisplayReadOnly,
      resolutionType: 'readonly',
      onClick: () => {
        openModal();
        setSelectedResolutionType('readonly');
      },
    },
  ];
  return <ActionButtons actions={actions} dataTestSubjPrefix={correctiveAction.type} />;
};

interface Props {
  openFlyout: () => void;
  setSelectedResolutionType: (step: IndicesResolutionType) => void;
  openModal: () => void;
}

export const ReindexActionCell: React.FunctionComponent<Props> = ({
  openFlyout,
  setSelectedResolutionType,
  openModal,
}) => {
  const { reindexState, deprecation } = useIndexContext();
  const correctiveAction = deprecation.correctiveAction?.type;

  if (reindexState.loadingState === LoadingState.Loading) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{actionsI18nTexts.reindexLoadingActionsText}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return correctiveAction === 'unfreeze' ? (
    <UnfreezeActionButtons
      openFlyout={openFlyout}
      correctiveAction={deprecation.correctiveAction as UnfreezeAction}
      setSelectedResolutionType={setSelectedResolutionType}
      openModal={openModal}
    />
  ) : (
    <ReindexActionButtons
      openFlyout={openFlyout}
      correctiveAction={deprecation.correctiveAction as ReindexAction}
      setSelectedResolutionType={setSelectedResolutionType}
      openModal={openModal}
    />
  );
};

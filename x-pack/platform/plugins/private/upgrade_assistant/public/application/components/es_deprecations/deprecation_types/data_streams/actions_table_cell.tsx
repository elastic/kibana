/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiText, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { DataStreamMigrationStatus, DataStreamsAction } from '../../../../../../common/types';
import { useDataStreamMigrationContext } from './context';
import { LoadingState } from '../../../types';
import { ActionButtonConfig, ActionButtons } from '../../common/action_buttons';

const actionsI18nTexts = {
  readOnlyTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionTooltipReadOnlyLabel',
    {
      defaultMessage: 'Resolve this issue by setting its indices to read-only.',
    }
  ),
  reindexTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionTooltipReindexLabel',
    {
      defaultMessage: 'Resolve this issue by reindexing this data stream.',
    }
  ),
  loadingStatusText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionLoadingActionsText',
    {
      defaultMessage: 'Loading actions…',
    }
  ),
};

interface Props {
  correctiveAction: DataStreamsAction;
  openFlyout: () => void;
  openModal: () => void;
}

export const DataStreamReindexActionsCell: React.FunctionComponent<Props> = ({
  correctiveAction,
  openFlyout,
  openModal,
}) => {
  const { migrationState } = useDataStreamMigrationContext();
  const reindexExcluded = correctiveAction.metadata.excludedActions?.includes('reindex');
  const readOnlyExcluded = correctiveAction.metadata.excludedActions?.includes('readOnly');
  const migrationInProgressOrCompleted =
    migrationState.status === DataStreamMigrationStatus.inProgress ||
    migrationState.status === DataStreamMigrationStatus.completed;

  const canDisplayReadOnly = !!(
    migrationState.hasRequiredPrivileges &&
    !readOnlyExcluded &&
    (!migrationInProgressOrCompleted ||
      (migrationInProgressOrCompleted && migrationState.resolutionType === 'readonly'))
  );

  const canDisplayReindex = !!(
    migrationState.hasRequiredPrivileges &&
    !reindexExcluded &&
    (!migrationInProgressOrCompleted ||
      (migrationInProgressOrCompleted && migrationState.resolutionType === 'reindex'))
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
      },
    },
  ];

  if (migrationState.loadingState === LoadingState.Loading) {
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s">{actionsI18nTexts.loadingStatusText}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
  return <ActionButtons actions={actions} dataTestSubjPrefix={correctiveAction.type} />;
};

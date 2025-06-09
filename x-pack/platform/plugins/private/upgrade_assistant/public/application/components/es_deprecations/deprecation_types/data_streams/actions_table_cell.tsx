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
import { DataStreamResolutionType, DataStreamsAction } from '../../../../../../common/types';
import { useDataStreamMigrationContext } from './context';
import { LoadingState } from '../../../types';

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
      'xpack.upgradeAssistant.esDeprecations.dataStream.resolutionLoadingActionsText',
      {
        defaultMessage: 'Loading actions…',
      }
    ),

    resolutionText: resolutionTexts[resolutionAction],
    resolutionTooltipLabel: resolutionTooltipLabels[resolutionAction],
  };
};

export const DataStreamReindexActionsCell: React.FunctionComponent<{
  correctiveAction: DataStreamsAction;
  openFlyout: () => void;
}> = ({ correctiveAction, openFlyout }) => {
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

  return (
    <EuiToolTip position="top" content={i18nTexts.resolutionTooltipLabel}>
      <EuiLink onClick={openFlyout} data-test-subj={`deprecation-${correctiveAction.type}`}>
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiIcon type="indexSettings" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">{i18nTexts.resolutionText}</EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiLink>
    </EuiToolTip>
  );
};

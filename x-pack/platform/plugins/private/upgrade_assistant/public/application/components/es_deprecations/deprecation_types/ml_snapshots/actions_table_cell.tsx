/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiToolTip, EuiFlexItem, EuiText, EuiFlexGroup, EuiIcon, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const i18nTexts = {
  resolutionText: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.resolutionText',
    {
      defaultMessage: 'Upgrade or delete snapshots',
    }
  ),
  resolutionTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.resolutionTooltipLabel',
    {
      defaultMessage:
        'Resolve this issue by upgrading or deleting a job model snapshot. This issue can be resolved automatically.',
    }
  ),
};

interface Props {
  openFlyout: () => void;
}

export const MlSnapshotsActionsCell: React.FunctionComponent<Props> = ({ openFlyout }) => {
  return (
    <EuiToolTip position="top" content={i18nTexts.resolutionTooltipLabel}>
      <EuiLink onClick={openFlyout} data-test-subj={'deprecation-mlSnapshot'}>
        <EuiFlexGroup gutterSize="s" alignItems="center" data-test-subj="mlActionsCell">
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

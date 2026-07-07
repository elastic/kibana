/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiToolTip, EuiIcon, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const i18nTexts = {
  resolutionTooltipLabel: i18n.translate(
    'xpack.upgradeAssistant.esDeprecations.mlSnapshots.resolutionTooltipLabel',
    {
      defaultMessage: 'Resolve this issue by upgrading or deleting a job model snapshot.',
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
        <EuiIcon type="gear" size="m" aria-label={i18nTexts.resolutionTooltipLabel} />
      </EuiLink>
    </EuiToolTip>
  );
};

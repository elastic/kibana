/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EisInferenceEndpointMetadata } from '@kbn/inference-common';
import React from 'react';

const RETIREMENT_WARNING_DAYS = 60;

const retirementWarningTooltip = (endOfLifeDate: string): string => {
  const formatted = new Date(endOfLifeDate).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  return i18n.translate(
    'xpack.agentBuilder.conversationInput.connectorSelector.modelBadge.retirement.tooltip',
    {
      defaultMessage: 'Retiring {date} — select a different model to avoid disruption.',
      values: { date: formatted },
    }
  );
};

interface ModelRetirementIconProps {
  metadata?: EisInferenceEndpointMetadata;
}

/** Warning icon with tooltip for models retiring within 60 days. */
export const ModelRetirementIcon: React.FC<ModelRetirementIconProps> = ({ metadata }) => {
  const endOfLifeDate = metadata?.heuristics?.end_of_life_date;
  if (!endOfLifeDate) return null;
  const msUntilEol = Date.parse(endOfLifeDate) - Date.now();
  if (msUntilEol > RETIREMENT_WARNING_DAYS * 24 * 60 * 60 * 1000) return null;
  return (
    <EuiToolTip content={retirementWarningTooltip(endOfLifeDate)}>
      <EuiIcon
        type="warning"
        size="s"
        color="warning"
        tabIndex={0}
        aria-label={retirementWarningTooltip(endOfLifeDate)}
        data-test-subj="modelBadgeRetirement"
      />
    </EuiToolTip>
  );
};

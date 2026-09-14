/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EisInferenceEndpointMetadata } from '@kbn/inference-common';
import React from 'react';

const NEARING_EOL_WARNING_DAYS = 60;

const nearingEolTooltip = (endOfLifeDate: string): string => {
  const formatted = new Date(endOfLifeDate).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
  return i18n.translate(
    'xpack.agentBuilder.conversationInput.connectorSelector.modelBadge.nearingEol.tooltip',
    {
      defaultMessage:
        'This model will be deprecated on {date}. We recommend a newer model for optimal results.',
      values: { date: formatted },
    }
  );
};

interface ModelRetirementIconProps {
  metadata?: EisInferenceEndpointMetadata;
}

/** Warning icon with tooltip for models nearing end-of-life (within 60 days). */
export const ModelRetirementIcon: React.FC<ModelRetirementIconProps> = ({ metadata }) => {
  const endOfLifeDate = metadata?.heuristics?.end_of_life_date;
  if (!endOfLifeDate) return null;
  const msUntilEol = Date.parse(endOfLifeDate) - Date.now();
  if (msUntilEol > NEARING_EOL_WARNING_DAYS * 24 * 60 * 60 * 1000) return null;
  return (
    <EuiIconTip
      type="warning"
      size="s"
      color="warning"
      content={nearingEolTooltip(endOfLifeDate)}
      aria-label={nearingEolTooltip(endOfLifeDate)}
      data-test-subj="modelNearingEolWarning"
    />
  );
};

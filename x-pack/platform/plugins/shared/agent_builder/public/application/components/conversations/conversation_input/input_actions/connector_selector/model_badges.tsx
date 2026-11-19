/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EisInferenceEndpointMetadata } from '@kbn/inference-common';
import moment from 'moment';
import React from 'react';

const NEARING_EOL_WARNING_DAYS = 60;
const NEARING_EOL_WARNING_MS = NEARING_EOL_WARNING_DAYS * 24 * 60 * 60 * 1000;

/**
 * Returns true when the model's end-of-life date is valid and within the next 60 days.
 * Returns false when the date is absent, unparseable, or more than 60 days away.
 */
export const isNearingEndOfLife = (metadata: EisInferenceEndpointMetadata | undefined): boolean => {
  const endOfLifeDate = metadata?.heuristics?.end_of_life_date;
  if (!endOfLifeDate) return false;
  const eolMs = Date.parse(endOfLifeDate);
  if (Number.isNaN(eolMs)) return false;
  return eolMs - Date.now() <= NEARING_EOL_WARNING_MS;
};

const nearingEolTooltip = (endOfLifeDate: string): string => {
  const m = moment(endOfLifeDate);
  const formatted = m.isValid() ? m.format('l') : null;
  return formatted
    ? i18n.translate(
        'xpack.agentBuilder.conversationInput.connectorSelector.modelBadge.nearingEol.tooltip',
        {
          defaultMessage:
            'This model will be deprecated on {date}. We recommend a newer model for optimal results.',
          values: { date: formatted },
        }
      )
    : i18n.translate(
        'xpack.agentBuilder.conversationInput.connectorSelector.modelBadge.nearingEol.tooltipNoDate',
        {
          defaultMessage:
            'This model will be deprecated soon. We recommend a newer model for optimal results.',
        }
      );
};

interface ModelRetirementIconProps {
  metadata?: EisInferenceEndpointMetadata;
}

/** Warning icon with tooltip for models nearing end-of-life (within 60 days). */
export const ModelRetirementIcon: React.FC<ModelRetirementIconProps> = ({ metadata }) => {
  if (!isNearingEndOfLife(metadata)) return null;
  const endOfLifeDate = metadata?.heuristics?.end_of_life_date ?? '';
  const tooltip = nearingEolTooltip(endOfLifeDate);
  return (
    <EuiIconTip
      type="warning"
      size="s"
      color="warning"
      content={tooltip}
      aria-label={tooltip}
      data-test-subj="modelNearingEolWarning"
    />
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EisInferenceEndpointMetadata } from '@kbn/inference-common';

import { useFormattedEOLDate } from '../../hooks/use_formatted_eol_date';

interface ModelEOLBadgeProps {
  id: string;
  metadata: EisInferenceEndpointMetadata | undefined;
}

export const ModelEOLBadge = ({ id, metadata }: ModelEOLBadgeProps) => {
  const eolDate = useFormattedEOLDate(metadata);

  const tooltipContent = eolDate
    ? i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.deprecatedEOLBadge.tooltip.content',
        {
          defaultMessage: "This model's end of life date is {eolDate}. It is no longer available.",
          values: { eolDate },
        }
      )
    : i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.deprecatedEOLBadge.tooltip.contentNoDate',
        {
          defaultMessage: 'This model has reached end of life and is no longer available.',
        }
      );

  return (
    <EuiToolTip
      title={i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.deprecatedEOLBadge.tooltip.title',
        {
          defaultMessage: 'End of life notice',
        }
      )}
      content={tooltipContent}
    >
      <EuiBadge
        tabIndex={0}
        iconSide="left"
        iconType="warning"
        color="error"
        data-test-subj={`modelEolBadge-${id}`}
      >
        {i18n.translate('xpack.searchInferenceEndpoints.eisModelCard.deprecatedEOLBadge.content', {
          defaultMessage: 'End of life',
        })}
      </EuiBadge>
    </EuiToolTip>
  );
};

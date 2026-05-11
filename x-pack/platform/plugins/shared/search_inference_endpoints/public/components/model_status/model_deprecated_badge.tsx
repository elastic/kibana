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

interface ModelDeprecatedBadgeProps {
  id: string;
  metadata: EisInferenceEndpointMetadata | undefined;
}

export const ModelDeprecatedBadge = ({ id, metadata }: ModelDeprecatedBadgeProps) => {
  const eolDate = useFormattedEOLDate(metadata);

  const tooltipContent = eolDate
    ? i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.deprecatedBadge.tooltip.content',
        {
          defaultMessage:
            'This model will be deprecated on {eolDate}. We recommend a newer model for optimal results.',
          values: { eolDate },
        }
      )
    : i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.deprecatedBadge.tooltip.contentNoDate',
        {
          defaultMessage:
            'This model is deprecated. We recommend a newer model for optimal results.',
        }
      );

  return (
    <EuiToolTip
      title={i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.deprecatedBadge.tooltip.title',
        {
          defaultMessage: 'Deprecation notice',
        }
      )}
      content={tooltipContent}
    >
      <EuiBadge
        tabIndex={0}
        iconSide="left"
        iconType="warning"
        color="warning"
        data-test-subj={`modelDeprecatedBadge-${id}`}
      >
        {i18n.translate('xpack.searchInferenceEndpoints.eisModelCard.deprecatedBadge.content', {
          defaultMessage: 'Deprecated',
        })}
      </EuiBadge>
    </EuiToolTip>
  );
};

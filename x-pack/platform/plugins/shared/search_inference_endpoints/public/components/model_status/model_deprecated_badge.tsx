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
import { getModelDeprecatedMessage } from '../../utils/eis_utils';

interface ModelDeprecatedBadgeProps {
  id: string;
  metadata: EisInferenceEndpointMetadata | undefined;
  iconOnly?: boolean;
}

export const ModelDeprecatedBadge = ({ id, metadata, iconOnly }: ModelDeprecatedBadgeProps) => {
  const eolDate = useFormattedEOLDate(metadata);

  const tooltipContent = getModelDeprecatedMessage(eolDate);

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
        {!iconOnly &&
          i18n.translate('xpack.searchInferenceEndpoints.eisModelCard.deprecatedBadge.content', {
            defaultMessage: 'Deprecated',
          })}
      </EuiBadge>
    </EuiToolTip>
  );
};

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
import { ModelDateTooltipContent } from './model_date_tooltip_content';

interface ModelEOLBadgeProps {
  id: string;
  metadata: EisInferenceEndpointMetadata | undefined;
  iconOnly?: boolean;
}

export const ModelEOLBadge = ({ id, metadata, iconOnly }: ModelEOLBadgeProps) => {
  const eolDate = useFormattedEOLDate(metadata);

  return (
    <EuiToolTip content={<ModelDateTooltipContent date={eolDate} status="endOfLife" />}>
      <EuiBadge
        tabIndex={0}
        iconSide="left"
        iconType="warning"
        color="danger"
        data-test-subj={`modelEolBadge-${id}`}
      >
        {!iconOnly &&
          i18n.translate('xpack.searchInferenceEndpoints.eisModelCard.deprecatedEOLBadge.content', {
            defaultMessage: 'End of life',
          })}
      </EuiBadge>
    </EuiToolTip>
  );
};

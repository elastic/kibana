/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getModelEOLDate } from '../../utils/eis_utils';
import type { EisInferenceEndpointMetadata } from '../../types';

interface ModelDeprecatedBadgeProps {
  id: string;
  metadata: EisInferenceEndpointMetadata | undefined;
}

export const ModelDeprecatedBadge = ({ id, metadata }: ModelDeprecatedBadgeProps) => {
  const eolDate = useMemo(() => {
    const modelEOLDate = getModelEOLDate(metadata);
    if (!modelEOLDate) {
      // This should not happen, but need to handle just-in-case we have metadata with deprecated status but no EOL date.
      return i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.deprecatedBadge.missingEOLDate',
        {
          defaultMessage: 'unknown end-of-life date',
        }
      );
    }
    return modelEOLDate.format('l');
  }, [metadata]);
  return (
    <EuiToolTip
      title={i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.deprecatedBadge.tooltip.title',
        {
          defaultMessage: 'Deprecation notice',
        }
      )}
      content={i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.deprecatedBadge.tooltip.content',
        {
          defaultMessage:
            'This model will be deprecated on {eolDate}. We recommend a newer model for optimal results.',
          values: { eolDate },
        }
      )}
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

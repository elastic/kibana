/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getModelEOLDate, type GroupedModel } from '../../utils/eis_utils';

interface ModelEOLBadgeProps {
  model: GroupedModel;
}

export const ModelEOLBadge = ({ model }: ModelEOLBadgeProps) => {
  const eolDate = useMemo(() => {
    const modelEOLDate = getModelEOLDate(model.modelMetadata);
    if (!modelEOLDate) {
      // This should not happen, but need to handle just-in-case we have metadata with deprecated status but no EOL date.
      return i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.deprecationBadge.missingEOLDate',
        {
          defaultMessage: 'unknown end-of-life date',
        }
      );
    }
    return modelEOLDate.format('l');
  }, [model]);
  return (
    <EuiToolTip
      title={i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.deprecationBadge.tooltip.title',
        {
          defaultMessage: 'Deprecation notice',
        }
      )}
      content={i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.deprecationBadge.tooltip.content',
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
        data-test-subj={`modelEolBadge-${model.modelName}`}
      >
        {i18n.translate('xpack.searchInferenceEndpoints.eisModelCard.deprecationBadge.content', {
          defaultMessage: 'EOL',
        })}
      </EuiBadge>
    </EuiToolTip>
  );
};

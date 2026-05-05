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

interface ModelDecommissionedBadgeProps {
  model: GroupedModel;
}

export const ModelDecommissionedBadge = ({ model }: ModelDecommissionedBadgeProps) => {
  const eolDate = useMemo(() => {
    const modelEOLDate = getModelEOLDate(model.modelMetadata);
    if (!modelEOLDate) {
      // This should not happen, but need to handle just-in-case we have metadata with deprecated status but no EOL date.
      return i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.decommissionedBadge.missingEOLDate',
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
        'xpack.searchInferenceEndpoints.eisModelCard.decommissionedBadge.tooltip.title',
        {
          defaultMessage: 'Deprecated model',
        }
      )}
      content={i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.decommissionedBadge.tooltip.content',
        {
          defaultMessage: 'This model was deprecated on {eolDate}.',
          values: { eolDate },
        }
      )}
    >
      <EuiBadge
        tabIndex={0}
        iconSide="left"
        iconType="warning"
        color="error"
        data-test-subj={`decommissionedBadge-${model.modelName}`}
      >
        {i18n.translate('xpack.searchInferenceEndpoints.eisModelCard.decommissionedBadge.content', {
          defaultMessage: 'Deprecated',
        })}
      </EuiBadge>
    </EuiToolTip>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ModelPreviewProps {
  id: string;
}

export const ModelPreviewBadge = ({ id }: ModelPreviewProps) => {
  return (
    <EuiToolTip
      position="bottom"
      title={i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.previewStatusBadge.tooltip.title',
        { defaultMessage: 'Preview model' }
      )}
      content={i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.previewStatusBadge.tooltip.content',
        {
          defaultMessage:
            'This model is still in preview status and not recommended for production applications.',
        }
      )}
      anchorProps={{ style: { alignSelf: 'flex-start' } }}
      data-test-subj={`modelPreviewBadgeTooltip-${id}`}
    >
      <EuiBadge color="primary" tabIndex={0} data-test-subj={`modelPreviewBadge-${id}`}>
        {i18n.translate('xpack.searchInferenceEndpoints.eisModelCard.previewStatusBadge.content', {
          defaultMessage: 'Preview',
        })}
      </EuiBadge>
    </EuiToolTip>
  );
};

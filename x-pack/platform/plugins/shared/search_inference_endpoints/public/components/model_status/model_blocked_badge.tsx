/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ModelBlockedBadgeProps {
  id: string;
}

export const ModelBlockedBadge = ({ id }: ModelBlockedBadgeProps) => {
  return (
    <EuiToolTip
      position="bottom"
      title={i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.blockedBadge.tooltip.title',
        { defaultMessage: 'Blocked by region policy' }
      )}
      content={i18n.translate(
        'xpack.searchInferenceEndpoints.eisModelCard.blockedBadge.tooltip.content',
        {
          defaultMessage: 'This model is not available within your current region preferences.',
        }
      )}
      anchorProps={{ style: { alignSelf: 'flex-start' } }}
      data-test-subj={`modelBlockedBadgeTooltip-${id}`}
    >
      <EuiBadge
        iconType="globe"
        iconSide="left"
        tabIndex={0}
        data-test-subj={`modelBlockedBadge-${id}`}
      >
        {i18n.translate('xpack.searchInferenceEndpoints.eisModelCard.blockedBadge.content', {
          defaultMessage: 'Blocked',
        })}
      </EuiBadge>
    </EuiToolTip>
  );
};

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

interface DataRetentionProps {
  metadata: EisInferenceEndpointMetadata | undefined;
}

export const DataRetention = ({ metadata }: DataRetentionProps) => {
  if (metadata?.heuristics?.properties?.includes('zero-data-retention')) {
    return (
      <EuiBadge
        color="success"
        iconType="checkCircleFill"
        iconSide="left"
        data-test-subj="modelDetailFlyoutDataRetentionBadge"
      >
        {i18n.translate(
          'xpack.searchInferenceEndpoints.modelDetailFlyout.zeroDataRetentionBadgeLabel',
          {
            defaultMessage: 'Zero Data Retention',
          }
        )}
      </EuiBadge>
    );
  }

  return (
    <EuiToolTip
      data-test-subj="modelDetailFlyoutDataRetentionTooltip"
      content={i18n.translate(
        'xpack.searchInferenceEndpoints.modelDetailFlyout.retainsDataTooltip',
        {
          defaultMessage:
            'The provider of this model retains the data used with it for a period of time. Your inputs are not used to train the models. Refer to the provider for more information on their policy.',
        }
      )}
    >
      <EuiBadge
        tabIndex={0}
        color="warning"
        iconType="warning"
        iconSide="left"
        data-test-subj="modelDetailFlyoutDataRetentionBadge"
      >
        {i18n.translate('xpack.searchInferenceEndpoints.modelDetailFlyout.retainsDataBadgeLabel', {
          defaultMessage: 'Data retained by provider',
        })}
      </EuiBadge>
    </EuiToolTip>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSwitch, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  featureId: string;
  checked: boolean;
  hasAvailableRecommendedEndpoints: boolean;
  canManage: boolean;
  onChange: (checked: boolean) => void;
}

export const RecommendedDefaultsSwitch: React.FC<Props> = ({
  featureId,
  checked,
  hasAvailableRecommendedEndpoints,
  canManage,
  onChange,
}) => (
  <EuiToolTip
    content={
      hasAvailableRecommendedEndpoints
        ? undefined
        : i18n.translate(
            'xpack.searchInferenceEndpoints.settings.useRecommendedDefaults.noRecommendedModels',
            { defaultMessage: 'No recommended models available.' }
          )
    }
    anchorProps={{ css: { alignSelf: 'flex-start' } }}
  >
    <EuiSwitch
      data-test-subj={`useRecommendedDefaultsToggle-${featureId}`}
      label={i18n.translate(
        'xpack.searchInferenceEndpoints.settings.useRecommendedDefaults.label',
        { defaultMessage: 'Use recommended defaults' }
      )}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={!canManage || !hasAvailableRecommendedEndpoints}
    />
  </EuiToolTip>
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ReasoningEffortLevel } from '../../../common/types';

interface EditEffortBadgeProps {
  endpointId: string;
  label: string;
  effort: ReasoningEffortLevel;
  onClick: () => void;
}

export const EditEffortBadge: React.FC<EditEffortBadgeProps> = ({
  endpointId,
  label,
  effort,
  onClick,
}) => (
  <EuiBadge
    onClick={onClick}
    onClickAriaLabel={i18n.translate(
      'xpack.searchInferenceEndpoints.settings.reasoningEffort.changeAriaLabel',
      {
        defaultMessage: 'Change reasoning effort for {label}',
        values: { label },
      }
    )}
    data-test-subj={`effort-badge-${endpointId}`}
  >
    {effort}
  </EuiBadge>
);

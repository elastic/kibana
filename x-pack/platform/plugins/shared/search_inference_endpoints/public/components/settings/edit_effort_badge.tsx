/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ReasoningEffortLevel } from '../../../common/types';

interface EditEffortBadgeProps {
  endpointId: string;
  label: string;
  effort: ReasoningEffortLevel;
  isUnsupported: boolean;
  onClick: () => void;
}

export const EditEffortBadge: React.FC<EditEffortBadgeProps> = ({
  endpointId,
  label,
  effort,
  isUnsupported,
  onClick,
}) => {
  const badge = (
    <EuiBadge
      color={isUnsupported ? 'warning' : 'default'}
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

  if (!isUnsupported) {
    return badge;
  }

  return (
    <EuiToolTip
      content={i18n.translate(
        'xpack.searchInferenceEndpoints.settings.reasoningEffort.unsupported',
        {
          defaultMessage:
            'This model no longer supports the {effort} reasoning effort. Choose another level or remove the customization.',
          values: { effort },
        }
      )}
      data-test-subj={`unsupported-effort-tooltip-${endpointId}`}
    >
      {badge}
    </EuiToolTip>
  );
};

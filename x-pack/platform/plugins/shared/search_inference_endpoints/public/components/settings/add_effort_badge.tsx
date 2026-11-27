/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export const ADD_EFFORT_CLASS_NAME = 'addEffortBadge';

const addEffortStyles = ({ euiTheme }: UseEuiTheme) => css`
  opacity: 0;
  transition: opacity ${euiTheme.animation.fast} ease-in-out;

  &:focus-within {
    opacity: 1;
  }
`;

interface AddEffortBadgeProps {
  endpointId: string;
  label: string;
  isPopoverOpen: boolean;
  onClick: () => void;
}

export const AddEffortBadge: React.FC<AddEffortBadgeProps> = ({
  endpointId,
  label,
  isPopoverOpen,
  onClick,
}) => (
  <EuiBadge
    color="hollow"
    iconType="plus"
    className={isPopoverOpen ? undefined : ADD_EFFORT_CLASS_NAME}
    css={isPopoverOpen ? undefined : addEffortStyles}
    onClick={onClick}
    onClickAriaLabel={i18n.translate(
      'xpack.searchInferenceEndpoints.settings.reasoningEffort.addAriaLabel',
      {
        defaultMessage: 'Set reasoning effort for {label}',
        values: { label },
      }
    )}
    data-test-subj={`add-effort-${endpointId}`}
  >
    {i18n.translate('xpack.searchInferenceEndpoints.settings.reasoningEffort.addEffort', {
      defaultMessage: 'Effort',
    })}
  </EuiBadge>
);

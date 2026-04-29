/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiButton, EuiToolTip } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';

interface FieldFilterApplyButtonProps {
  disabled?: boolean;
  onClick: () => void;
  tooltipContent?: string;
}

export const ItemFilterApplyButton: FC<FieldFilterApplyButtonProps> = ({
  disabled,
  onClick,
  tooltipContent,
}) => {
  const button = (
    <EuiButton
      data-test-subj={`aiopsFieldFilterApplyButton${disabled ? ' disabled' : ''}`}
      size="s"
      onClick={onClick}
      disabled={disabled}
    >
      <FormattedMessage
        id="xpack.aiops.logRateAnalysis.page.fieldFilterApplyButtonLabel"
        defaultMessage="Apply"
      />
    </EuiButton>
  );

  if (tooltipContent) {
    return (
      <EuiToolTip position="left" content={tooltipContent}>
        {button}
      </EuiToolTip>
    );
  }

  return button;
};

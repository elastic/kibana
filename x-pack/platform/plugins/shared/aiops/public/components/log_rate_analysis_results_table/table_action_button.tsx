/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { EuiLink, EuiIcon, EuiText, EuiToolTip, type IconType } from '@elastic/eui';

interface TableActionButtonProps {
  iconType: IconType;
  dataTestSubjPostfix: string;
  isDisabled: boolean;
  label: string;
  tooltipText?: string;
  onClick: () => void;
}

export const TableActionButton: FC<TableActionButtonProps> = ({
  iconType,
  dataTestSubjPostfix,
  isDisabled,
  label,
  tooltipText,
  onClick,
}) => {
  const buttonContent = (
    <>
      <EuiIcon type={iconType} css={{ marginRight: '8px' }} />
      {label}
    </>
  );

  const unwrappedButton = !isDisabled ? (
    <EuiLink
      data-test-subj={`aiopsTableActionButton${dataTestSubjPostfix} enabled`}
      onClick={onClick}
      color={'text'}
      aria-label={tooltipText}
    >
      {buttonContent}
    </EuiLink>
  ) : (
    <EuiText
      data-test-subj={`aiopsTableActionButton${dataTestSubjPostfix} disabled`}
      size="s"
      color={'subdued'}
      aria-label={tooltipText}
      css={{ fontWeight: 500 }}
    >
      {buttonContent}
    </EuiText>
  );

  if (tooltipText) {
    return <EuiToolTip content={tooltipText}>{unwrappedButton}</EuiToolTip>;
  }

  return unwrappedButton;
};

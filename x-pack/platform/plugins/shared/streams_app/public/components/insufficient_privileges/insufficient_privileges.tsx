/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useToggle from 'react-use/lib/useToggle';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiButtonIconProps,
  EuiPopover,
  EuiToolTip,
  EuiIcon,
  EuiFlexGroup,
  EuiButtonIconPropsForButton,
} from '@elastic/eui';

const insufficientPrivilegesText = i18n.translate('xpack.streams.insufficientPrivilegesMessage', {
  defaultMessage: "You don't have sufficient privileges to access this information.",
});

export const PrivilegesWarningIconWrapper = ({
  hasPrivileges,
  title,
  mode = 'popover',
  iconColor = 'warning',
  popoverCss,
  children,
}: {
  hasPrivileges: boolean;
  title: string;
  mode?: 'tooltip' | 'popover';
  iconColor?: EuiButtonIconPropsForButton['color'];
  popoverCss?: EuiButtonIconProps['css'];
  children: React.ReactNode;
}) => {
  const [isPopoverOpen, togglePopover] = useToggle(false);

  const handleButtonClick = togglePopover;

  if (hasPrivileges) {
    return <>{children}</>;
  }

  return mode === 'popover' ? (
    <EuiPopover
      css={popoverCss}
      attachToAnchor={true}
      anchorPosition="downCenter"
      button={
        <EuiButtonIcon
          data-test-subj={`streamsInsufficientPrivileges-${title}`}
          aria-label={insufficientPrivilegesText}
          title={insufficientPrivilegesText}
          iconType="warning"
          color={iconColor}
          onClick={handleButtonClick}
        />
      }
      isOpen={isPopoverOpen}
      closePopover={togglePopover}
    >
      {insufficientPrivilegesText}
    </EuiPopover>
  ) : (
    <EuiToolTip content={insufficientPrivilegesText}>
      <EuiFlexGroup alignItems="center">
        <EuiIcon
          data-test-subj={`streamsInsufficientPrivileges-${title}`}
          aria-label={insufficientPrivilegesText}
          title={insufficientPrivilegesText}
          type="warning"
          color={iconColor}
        />
        {children}
      </EuiFlexGroup>
    </EuiToolTip>
  );
};

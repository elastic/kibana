/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiButtonIconProps, EuiButtonIconPropsForButton } from '@elastic/eui';
import { TooltipOrPopoverIcon } from '../tooltip_popover_icon/tooltip_popover_icon';

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
  if (hasPrivileges) {
    return <>{children}</>;
  }

  return (
    <TooltipOrPopoverIcon
      dataTestSubj={`streamsInsufficientPrivileges-${title}`}
      title={insufficientPrivilegesText}
      mode={mode}
      icon="warning"
      iconColor={iconColor}
      popoverCss={popoverCss}
    >
      {children}
    </TooltipOrPopoverIcon>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiPopover, IconType } from '@elastic/eui';
import React, { useState } from 'react';

import { BarAction, BarActionProps } from './styles';

interface PopoverProps {
  children: BarActionProps['children'];
  popoverContent?: React.ReactNode;
}

const Popover = React.memo<UtilityBarActionProps>(({ children, popoverContent }) => {
  const [popoverState, setPopoverState] = useState(false);

  return (
    <EuiPopover
      button={
        <BarAction onClick={() => setPopoverState(!popoverState)}>
          {children}
          <EuiIcon size="s" type="arrowDown" />
        </BarAction>
      }
      isOpen={popoverState}
      closePopover={() => setPopoverState(false)}
    >
      {popoverContent}
    </EuiPopover>
  );
});
Popover.displayName = 'Popover';

export interface UtilityBarActionProps extends BarActionProps {
  iconSide?: 'left' | 'right';
  iconType?: IconType;
  popoverContent?: PopoverProps['popoverContent'];
}

export const UtilityBarAction = React.memo<UtilityBarActionProps>(
  ({ children, href, iconSide = 'left', iconType, onClick, popoverContent }) => {
    if (popoverContent) {
      return <Popover popoverContent={popoverContent}>{children}</Popover>;
    } else {
      return (
        <BarAction href={href} onClick={onClick}>
          {iconType && iconSide === 'left' && <EuiIcon size="s" type={iconType} />}
          {children}
          {iconType && iconSide === 'right' && <EuiIcon size="s" type={iconType} />}
        </BarAction>
      );
    }
  }
);
UtilityBarAction.displayName = 'UtilityBarAction';

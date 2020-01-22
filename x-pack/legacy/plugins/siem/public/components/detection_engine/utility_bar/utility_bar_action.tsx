/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPopover } from '@elastic/eui';
import React, { useCallback, useState } from 'react';

import { LinkIcon, LinkIconProps } from '../../link_icon';
import { BarAction } from './styles';

const Popover = React.memo<UtilityBarActionProps>(
  ({ children, color, iconSide, iconSize, iconType, popoverContent }) => {
    const [popoverState, setPopoverState] = useState(false);

    const closePopover = useCallback(() => setPopoverState(false), [setPopoverState]);

    return (
      <EuiPopover
        button={
          <LinkIcon
            color={color}
            iconSide={iconSide}
            iconSize={iconSize}
            iconType={iconType}
            onClick={() => setPopoverState(!popoverState)}
          >
            {children}
          </LinkIcon>
        }
        closePopover={() => setPopoverState(false)}
        isOpen={popoverState}
      >
        {popoverContent?.(closePopover)}
      </EuiPopover>
    );
  }
);

Popover.displayName = 'Popover';

export interface UtilityBarActionProps extends LinkIconProps {
  popoverContent?: (closePopover: () => void) => React.ReactNode;
}

export const UtilityBarAction = React.memo<UtilityBarActionProps>(
  ({ children, color, disabled, href, iconSide, iconSize, iconType, onClick, popoverContent }) => (
    <BarAction>
      {popoverContent ? (
        <Popover
          color={color}
          iconSide={iconSide}
          iconSize={iconSize}
          iconType={iconType}
          popoverContent={popoverContent}
        >
          {children}
        </Popover>
      ) : (
        <LinkIcon
          color={color}
          disabled={disabled}
          href={href}
          iconSide={iconSide}
          iconSize={iconSize}
          iconType={iconType}
          onClick={onClick}
        >
          {children}
        </LinkIcon>
      )}
    </BarAction>
  )
);

UtilityBarAction.displayName = 'UtilityBarAction';

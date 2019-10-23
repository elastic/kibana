/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';

import { LinkIcon, LinkIconProps } from '../link_icon';
import { BarAction } from './styles';

interface PopoverProps {
  children: LinkIconProps['children'];
  popoverContent?: React.ReactNode;
}

const Popover = React.memo<UtilityBarActionProps>(({ children, iconOptions, popoverContent }) => {
  const [popoverState, setPopoverState] = useState(false);

  return (
    <EuiPopover
      button={
        <LinkIcon iconOptions={iconOptions} onClick={() => setPopoverState(!popoverState)}>
          {children}
        </LinkIcon>
      }
      isOpen={popoverState}
      closePopover={() => setPopoverState(false)}
    >
      {popoverContent}
    </EuiPopover>
  );
});
Popover.displayName = 'Popover';

// type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
// type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// export interface UtilityBarActionProps extends PartialBy<LinkIconProps, 'iconType'> {
//   popoverContent?: PopoverProps['popoverContent'];
// }

export interface UtilityBarActionProps extends LinkIconProps {
  popoverContent?: PopoverProps['popoverContent'];
}

export const UtilityBarAction = React.memo<UtilityBarActionProps>(
  ({ children, href, iconOptions, onClick, popoverContent }) => (
    <BarAction>
      {popoverContent ? (
        <Popover iconOptions={iconOptions} popoverContent={popoverContent}>
          {children}
        </Popover>
      ) : (
        <LinkIcon href={href} iconOptions={iconOptions} onClick={onClick}>
          {children}
        </LinkIcon>
      )}
    </BarAction>
  )
);
UtilityBarAction.displayName = 'UtilityBarAction';

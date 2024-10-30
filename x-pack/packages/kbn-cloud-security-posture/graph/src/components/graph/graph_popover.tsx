/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type PropsWithChildren } from 'react';
import type { CommonProps, EuiWrappingPopoverProps } from '@elastic/eui';
import { EuiWrappingPopover } from '@elastic/eui';

export interface GraphPopoverProps
  extends PropsWithChildren,
    CommonProps,
    Pick<
      EuiWrappingPopoverProps,
      'anchorPosition' | 'panelClassName' | 'panelPaddingSize' | 'panelStyle' | 'panelProps'
    > {
  isOpen: boolean;
  anchorElement: HTMLElement | null;
  closePopover: () => void;
}

export const GraphPopover: React.FC<GraphPopoverProps> = ({
  isOpen,
  anchorElement,
  closePopover,
  children,
  ...rest
}) => {
  if (!anchorElement) {
    return null;
  }

  return (
    <EuiWrappingPopover
      {...rest}
      isOpen={isOpen}
      closePopover={closePopover}
      button={anchorElement}
      ownFocus={true}
      focusTrapProps={{
        clickOutsideDisables: false,
        disabled: false,
        crossFrame: true,
        noIsolation: false,
        returnFocus: (el) => {
          anchorElement.focus();
          return false;
        },
        preventScrollOnFocus: true,
        onClickOutside: () => {
          closePopover();
        },
      }}
    >
      {children}
    </EuiWrappingPopover>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import {
  EuiIcon,
  EuiLink,
  EuiLinkButtonProps,
  EuiPopover,
  EuiPopoverProps,
  EuiWrappingPopover,
  EuiWrappingPopoverProps,
  EuiPopoverTitle,
  EuiText,
  UseEuiTheme,
} from '@elastic/eui';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { StartServices } from '../../types';

export const HelpPopoverButton = ({
  children,
  onClick,
}: {
  children: string;
  onClick: EuiLinkButtonProps['onClick'];
}) => {
  return (
    <EuiText size="xs">
      <EuiLink onClick={onClick}>
        <EuiIcon size="s" type="help" css={HelpPopoverStyles.button} />
        {children}
      </EuiLink>
    </EuiText>
  );
};

const HelpPopoverContent = ({ title, children }: { title?: string; children: ReactNode }) => {
  return (
    <>
      {title && <EuiPopoverTitle paddingSize="m">{title}</EuiPopoverTitle>}
      <EuiText className="eui-yScroll" size="s" css={HelpPopoverStyles.content}>
        {children}
      </EuiText>
    </>
  );
};

const HelpPopoverStyles = {
  button: ({ euiTheme }: UseEuiTheme) => `
    margin-right: ${euiTheme.size.xs};
  `,
  content: ({ euiTheme }: UseEuiTheme) => `
    max-height: 40vh;
    padding: ${euiTheme.size.m};
  `,
};

export const HelpPopover = ({
  anchorPosition,
  button,
  children,
  closePopover,
  isOpen,
  title,
}: {
  anchorPosition?: EuiPopoverProps['anchorPosition'];
  button: EuiPopoverProps['button'];
  children: ReactNode;
  closePopover: EuiPopoverProps['closePopover'];
  isOpen: EuiPopoverProps['isOpen'];
  title?: string;
}) => {
  return (
    <EuiPopover
      anchorPosition={anchorPosition}
      button={button}
      closePopover={closePopover}
      isOpen={isOpen}
      ownFocus
      panelStyle={{ maxInlineSize: '480px' }}
      panelPaddingSize="none"
    >
      <HelpPopoverContent title={title}>{children}</HelpPopoverContent>
    </EuiPopover>
  );
};

export const WrappingHelpPopover = ({
  anchorPosition,
  button,
  children,
  closePopover,
  isOpen,
  title,
  startServices,
}: {
  anchorPosition?: EuiWrappingPopoverProps['anchorPosition'];
  button: EuiWrappingPopoverProps['button'];
  children: ReactNode;
  closePopover: EuiWrappingPopoverProps['closePopover'];
  isOpen: EuiWrappingPopoverProps['isOpen'];
  title?: string;
  startServices: StartServices;
}) => {
  return (
    <KibanaRenderContextProvider {...startServices}>
      <EuiWrappingPopover
        anchorPosition={anchorPosition}
        button={button}
        closePopover={closePopover}
        isOpen={isOpen}
        ownFocus
        panelStyle={{ maxInlineSize: '480px' }}
        panelPaddingSize="none"
      >
        <HelpPopoverContent title={title}>{children}</HelpPopoverContent>
      </EuiWrappingPopover>
    </KibanaRenderContextProvider>
  );
};

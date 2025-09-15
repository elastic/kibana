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
  type UseEuiTheme,
  useEuiTheme,
} from '@elastic/eui';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { css } from '@emotion/react';
import { StartServices } from '../../types';

export const HelpPopoverButton = ({
  children,
  onClick,
}: {
  children: string;
  onClick: EuiLinkButtonProps['onClick'];
}) => {
  const euiThemeContext = useEuiTheme();
  return (
    <EuiText size="xs">
      <EuiLink onClick={onClick}>
        <EuiIcon size="s" type="question" css={helpPopoverStyles.button(euiThemeContext)} />
        {children}
      </EuiLink>
    </EuiText>
  );
};

const HelpPopoverContent = ({ title, children }: { title?: string; children: ReactNode }) => {
  const euiThemeContext = useEuiTheme();
  return (
    <>
      {title && <EuiPopoverTitle paddingSize="m">{title}</EuiPopoverTitle>}
      <EuiText className="eui-yScroll" size="s" css={helpPopoverStyles.content(euiThemeContext)}>
        {children}
      </EuiText>
    </>
  );
};

const helpPopoverStyles = {
  button: ({ euiTheme }: UseEuiTheme) => css`
    margin-right: ${euiTheme.size.xs};
  `,
  content: ({ euiTheme }: UseEuiTheme) => css`
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

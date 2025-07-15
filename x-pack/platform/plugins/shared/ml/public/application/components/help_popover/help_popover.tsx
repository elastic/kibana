/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiLinkButtonProps, EuiPopoverProps } from '@elastic/eui';
import { EuiButtonIcon, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';
import type { SerializedStyles } from '@emotion/react';
import { useHelpPopoverStyles } from './help_popover_styles';

export const HelpPopoverButton: FC<{
  onClick: EuiLinkButtonProps['onClick'];
  styles?: SerializedStyles;
}> = ({ onClick, styles }) => {
  return (
    <EuiButtonIcon
      size="s"
      iconType="question"
      aria-label={i18n.translate('xpack.ml.helpPopover.ariaLabel', {
        defaultMessage: 'Help',
      })}
      onClick={onClick}
      css={styles}
    />
  );
};

interface HelpPopoverProps {
  anchorPosition?: EuiPopoverProps['anchorPosition'];
  title?: string;
  buttonCss?: SerializedStyles;
}

export const HelpPopover: FC<PropsWithChildren<HelpPopoverProps>> = ({
  anchorPosition,
  children,
  title,
  buttonCss,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { helpPopoverPanel, helpPopoverContent } = useHelpPopoverStyles();

  return (
    <EuiPopover
      anchorPosition={anchorPosition}
      button={
        <HelpPopoverButton
          onClick={setIsPopoverOpen.bind(null, !isPopoverOpen)}
          styles={buttonCss}
        />
      }
      closePopover={setIsPopoverOpen.bind(null, false)}
      isOpen={isPopoverOpen}
      ownFocus
      panelProps={{ css: helpPopoverPanel }}
      panelPaddingSize="none"
    >
      {title && <EuiPopoverTitle paddingSize="s">{title}</EuiPopoverTitle>}

      <EuiText css={helpPopoverContent} size="s" tabIndex={0}>
        {children}
      </EuiText>
    </EuiPopover>
  );
};

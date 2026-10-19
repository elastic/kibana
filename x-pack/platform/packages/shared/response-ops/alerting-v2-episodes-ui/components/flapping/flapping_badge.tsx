/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { ReactElement } from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiPopover, EuiPopoverTitle, EuiText } from '@elastic/eui';
import * as i18n from './translations';

const popoverBodyCss = css`
  max-width: 280px;
`;

/**
 * Hollow "Flapping" badge with a popover explaining the detection thresholds.
 */
export function FlappingBadge() {
  return (
    <FlappingPopover
      renderButton={(onClick) => (
        <EuiBadge
          color="hollow"
          iconType="chartGauge"
          iconSide="left"
          tabIndex={0}
          onClick={onClick}
          onClickAriaLabel={i18n.FLAPPING_BADGE_ARIA_LABEL}
          data-test-subj="alertEpisodeFlappingBadge"
        >
          {i18n.FLAPPING_BADGE_LABEL}
        </EuiBadge>
      )}
    />
  );
}

interface FlappingPopoverProps {
  renderButton: (onClick: () => void) => ReactElement;
}

/** Adds the standard flapping explanation popover to the supplied trigger. */
export const FlappingPopover = ({ renderButton }: FlappingPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const button = renderButton(() => setIsOpen((open) => !open));

  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="s"
      anchorPosition="downCenter"
      data-test-subj="alertEpisodeFlappingPopover"
      aria-label={i18n.FLAPPING_BADGE_ARIA_LABEL}
    >
      <EuiPopoverTitle>{i18n.FLAPPING_POPOVER_TITLE}</EuiPopoverTitle>
      <EuiText size="s" css={popoverBodyCss}>
        <p>{i18n.FLAPPING_POPOVER_BODY}</p>
      </EuiText>
    </EuiPopover>
  );
};

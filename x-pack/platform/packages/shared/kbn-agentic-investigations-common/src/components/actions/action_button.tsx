/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';

export const ActionButton = memo(
  ({
    iconType,
    onClick,
    tooltipContent,
    href,
    'data-test-subj': dataTestSubj,
  }: {
    iconType: string;
    onClick: () => void;
    tooltipContent: string;
    /**
     * Renders the control as a link. Supply it whenever the action is a navigation: the URL is
     * then visible on hover and the target can be opened in a new tab, which a button cannot do.
     * The click is still handled by `onClick` so in-app routing is preserved.
     */
    href?: string;
    'data-test-subj'?: string;
  }) => {
    return (
      <EuiToolTip content={tooltipContent} disableScreenReaderOutput>
        <EuiButtonIcon
          size="s"
          aria-label={tooltipContent}
          iconType={iconType}
          color="text"
          href={href}
          data-test-subj={dataTestSubj}
          onClick={(event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
            // The card behind this control is itself clickable, so the event must not reach it.
            event.stopPropagation();
            // Let modified clicks (new tab, new window) and middle clicks fall through to the
            // browser, which is the reason for rendering a real link in the first place.
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
              return;
            }
            event.preventDefault();
            onClick();
          }}
        />
      </EuiToolTip>
    );
  }
);

ActionButton.displayName = 'ActionButton';

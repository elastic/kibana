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
  }: {
    iconType: string;
    onClick: () => void;
    tooltipContent: string;
  }) => {
    return (
      <EuiToolTip content={tooltipContent} disableScreenReaderOutput>
        <EuiButtonIcon
          size="s"
          aria-label={tooltipContent}
          iconType={iconType}
          color="text"
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            onClick();
          }}
        />
      </EuiToolTip>
    );
  }
);

ActionButton.displayName = 'ActionButton';

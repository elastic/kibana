/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { SHOW_ON_CANVAS_BUTTON_LABEL, SHOW_ON_CANVAS_DISABLED_TOOLTIP } from './translations';

export function ShowOnCanvasButton({
  destinationName,
  isOnCanvas,
  onClick,
}: {
  destinationName: string;
  isOnCanvas: boolean;
  onClick: (destinationName: string) => void;
}) {
  return (
    <EuiToolTip
      content={isOnCanvas ? SHOW_ON_CANVAS_BUTTON_LABEL : SHOW_ON_CANVAS_DISABLED_TOOLTIP}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        iconType="graphApp"
        size="xs"
        aria-label={SHOW_ON_CANVAS_BUTTON_LABEL}
        isDisabled={!isOnCanvas}
        data-test-subj={`streamsShowOnCanvasActionButton-${destinationName}`}
        onClick={() => onClick(destinationName)}
      />
    </EuiToolTip>
  );
}

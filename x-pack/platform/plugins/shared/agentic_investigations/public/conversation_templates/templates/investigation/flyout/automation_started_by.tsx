/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import {
  AUTOMATION_INSTRUCTIONS_SHOW_LESS,
  AUTOMATION_INSTRUCTIONS_SHOW_MORE,
} from '../translations';

/** Instructions up to this size show in full; longer ones are clamped until expanded. */
const MAX_UNCLAMPED_LENGTH = 300;
const MAX_UNCLAMPED_LINES = 4;
const CLAMPED_LINES = 4;

const textStyles = css`
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const clampedTextStyles = css`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: ${CLAMPED_LINES};
  overflow: hidden;
`;

const isLong = (text: string): boolean =>
  text.length > MAX_UNCLAMPED_LENGTH || text.split('\n').length > MAX_UNCLAMPED_LINES;

export interface AutomationStartedByProps {
  name: string;
  /** The instructions the automation ran with. Rendered as plain text. */
  instructions?: string;
}

/** The automation that started an investigation, with the instructions it ran with. */
export const AutomationStartedBy: React.FC<AutomationStartedByProps> = ({ name, instructions }) => {
  const [expanded, setExpanded] = useState(false);
  const clampable = instructions !== undefined && isLong(instructions);

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem>
        <EuiText size="s" data-test-subj="investigationOverviewAutomationName" css={textStyles}>
          <strong>{name}</strong>
        </EuiText>
      </EuiFlexItem>
      {instructions !== undefined && (
        <EuiFlexItem>
          <EuiText
            size="s"
            color="subdued"
            data-test-subj="investigationOverviewAutomationInstructions"
            css={clampable && !expanded ? [textStyles, clampedTextStyles] : textStyles}
          >
            {instructions}
          </EuiText>
          {clampable && (
            <div>
              <EuiButtonEmpty
                size="s"
                flush="left"
                data-test-subj="investigationOverviewAutomationToggle"
                onClick={() => setExpanded((prev) => !prev)}
              >
                {expanded ? AUTOMATION_INSTRUCTIONS_SHOW_LESS : AUTOMATION_INSTRUCTIONS_SHOW_MORE}
              </EuiButtonEmpty>
            </div>
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

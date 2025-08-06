/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiResizableContainer } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useRef, useState } from 'react';

const fullHeightStyles = css`
  height: 100%;
`;
const fullSizeStyles = css`
  ${fullHeightStyles}
  width: 100%;
`;
const INITIAL_INPUT_PANEL_PERCENTAGE = 15;
const MIN_INPUT_PANEL_HEIGHT = 130;
const MAX_INPUT_PANEL_PERCENTAGE = 45;
const panelIds = {
  INPUT: 'input-panel',
  CONTENT: 'content-panel',
} as const;

interface ConversationResizableContainerProps {
  content: React.ReactNode;
  input: (onInputHeightChange: (heightDiff: number) => void) => React.ReactNode;
}
export const ConversationResizableContainer: React.FC<ConversationResizableContainerProps> = ({
  content,
  input,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inputPanelPercentage, setInputPanelPercentage] = useState(INITIAL_INPUT_PANEL_PERCENTAGE);
  const contentPanelPercentage = 100 - inputPanelPercentage;
  const hasUserResizedRef = useRef(false);
  const initialInputPanelHeightRef = useRef<number>();
  // Ensure the input panel is at least the minimum size
  // Necessary until this bug is closed https://github.com/elastic/eui/issues/4453
  useEffect(() => {
    if (initialInputPanelHeightRef.current !== undefined) {
      return;
    }
    const containerHeight = containerRef.current?.getBoundingClientRect().height;
    if (!containerHeight) {
      return;
    }
    const inputPanelHeight = containerHeight * (inputPanelPercentage / 100);
    if (inputPanelHeight < MIN_INPUT_PANEL_HEIGHT) {
      initialInputPanelHeightRef.current = MIN_INPUT_PANEL_HEIGHT;
      const minInputPanelPercentage = Math.ceil((MIN_INPUT_PANEL_HEIGHT / containerHeight) * 100);
      setInputPanelPercentage(minInputPanelPercentage);
    } else {
      initialInputPanelHeightRef.current = inputPanelHeight;
    }
  }, [inputPanelPercentage]);
  const onInputHeightChange = (heightDiff: number) => {
    if (hasUserResizedRef.current) {
      // If the user has manually resized, we don't want to override their changes
      return;
    }
    if (!containerRef.current) {
      throw new Error('Container ref is not set');
    }
    if (initialInputPanelHeightRef.current === undefined) {
      throw new Error('Initial input panel height is not set');
    }
    const containerHeight = containerRef.current.getBoundingClientRect().height;
    if (containerHeight === 0) {
      return;
    }
    const neededHeight = initialInputPanelHeightRef.current + heightDiff;
    const neededPercentage = (neededHeight / containerHeight) * 100;
    const minPercentage = (MIN_INPUT_PANEL_HEIGHT / containerHeight) * 100;
    const targetPercentage = Math.max(neededPercentage, minPercentage);

    // Don't grow beyond max percentage and never automatically shrink
    if (targetPercentage > MAX_INPUT_PANEL_PERCENTAGE || targetPercentage < inputPanelPercentage) {
      return;
    }

    setInputPanelPercentage(targetPercentage);
  };
  return (
    <div ref={containerRef} css={fullSizeStyles}>
      <EuiResizableContainer
        css={fullSizeStyles}
        direction="vertical"
        onPanelWidthChange={(nextPanelSizes) => {
          const nextInputPanelSize = nextPanelSizes[panelIds.INPUT];
          if (nextInputPanelSize !== undefined) {
            setInputPanelPercentage(nextInputPanelSize);
          }
        }}
        onResizeStart={() => {
          hasUserResizedRef.current = true;
        }}
      >
        {(EuiResizablePanel, EuiResizableButton) => {
          return (
            <>
              <EuiResizablePanel id={panelIds.CONTENT} size={contentPanelPercentage}>
                {content}
              </EuiResizablePanel>
              <EuiResizableButton />
              <EuiResizablePanel
                id={panelIds.INPUT}
                size={inputPanelPercentage}
                minSize={`${MIN_INPUT_PANEL_HEIGHT}px`}
                scrollable={false}
              >
                {input(onInputHeightChange)}
              </EuiResizablePanel>
            </>
          );
        }}
      </EuiResizableContainer>
    </div>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiResizableContainer, useEuiScrollBar } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useRef, useState } from 'react';
import { useHasActiveConversation } from '../../hooks/use_conversation';
import { useStickToBottom } from '../../hooks/use_stick_to_bottom';
import { ConversationInputForm } from './conversation_input/conversation_input_form';
import { ConversationRounds } from './conversation_rounds/conversation_rounds';
import { NewConversationPrompt } from './new_conversation_prompt';
import { useConversationId } from '../../hooks/use_conversation_id';

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

export const Conversation: React.FC<{}> = () => {
  const conversationId = useConversationId();
  const hasActiveConversation = useHasActiveConversation();
  const [inputPanelPercentage, setInputPanelPercentage] = useState(INITIAL_INPUT_PANEL_PERCENTAGE);
  const contentPanelPercentage = 100 - inputPanelPercentage;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initialInputPanelHeightRef = useRef<number>();

  const scrollContainerStyles = css`
    overflow-y: auto;
    ${fullHeightStyles}
    ${useEuiScrollBar()}
  `;
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const { setStickToBottom } = useStickToBottom({
    defaultState: true,
    scrollContainer: scrollContainerRef.current,
  });

  useEffect(() => {
    setStickToBottom(true);
  }, [conversationId, setStickToBottom]);

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
  const hasUserResizedRef = useRef(false);

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
              {hasActiveConversation ? (
                <EuiResizablePanel id={panelIds.CONTENT} size={contentPanelPercentage}>
                  <div css={scrollContainerStyles}>
                    <div ref={scrollContainerRef}>
                      <ConversationRounds />
                    </div>
                  </div>
                </EuiResizablePanel>
              ) : (
                <EuiResizablePanel id={panelIds.CONTENT} size={contentPanelPercentage}>
                  <div css={fullHeightStyles}>
                    <NewConversationPrompt />
                  </div>
                </EuiResizablePanel>
              )}
              <EuiResizableButton />
              <EuiResizablePanel
                id={panelIds.INPUT}
                size={inputPanelPercentage}
                minSize={`${MIN_INPUT_PANEL_HEIGHT}px`}
                scrollable={false}
              >
                <ConversationInputForm
                  onSubmit={() => {
                    setStickToBottom(true);
                  }}
                  onTextAreaHeightChange={(heightDiff) => {
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
                    if (
                      targetPercentage > MAX_INPUT_PANEL_PERCENTAGE ||
                      targetPercentage < inputPanelPercentage
                    ) {
                      return;
                    }

                    setInputPanelPercentage(targetPercentage);
                  }}
                />
              </EuiResizablePanel>
            </>
          );
        }}
      </EuiResizableContainer>
    </div>
  );
};

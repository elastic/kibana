/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonColor } from '@elastic/eui';
import React, { useCallback } from 'react';
import { AiButton } from '@kbn/shared-ux-ai-components';
import type { EuiButtonEmptySizes } from '@elastic/eui/src/components/button/button_empty/button_empty';
import * as i18n from './translations';

export const BUTTON_TEST_ID = 'newChatByTitle';
export const BUTTON_TEXT_TEST_ID = 'newChatByTitleText';

export interface NewChatByTitleComponentProps {
  /**
   * Optionally specify color of empty button.
   * @default 'primary'
   */
  color?: EuiButtonColor;
  /**
   * Callback to display the assistant overlay
   */
  showAssistantOverlay: (show: boolean) => void;
  /**
   *
   */
  size?: EuiButtonEmptySizes;
  /**
   * Optionally specify the text to display.
   */
  text?: string;
}

const NewChatByTitleComponent: React.FC<NewChatByTitleComponentProps> = ({
  color = 'primary',
  showAssistantOverlay,
  size = 'm',
  text,
}) => {
  const showOverlay = useCallback(() => showAssistantOverlay(true), [showAssistantOverlay]);

  return (
    <AiButton
      aria-label={i18n.ASK_AI_ASSISTANT}
      data-test-subj={BUTTON_TEST_ID}
      onClick={showOverlay}
      size={size}
      variant="empty"
      iconType="aiAssistantLogo"
      iconOnly={!text}
    >
      {text ? <span data-test-subj={BUTTON_TEXT_TEST_ID}>{text}</span> : null}
    </AiButton>
  );
};

NewChatByTitleComponent.displayName = 'NewChatByTitleComponent';

/**
 * `NewChatByTitle` displays a button by providing only the `promptContextId`
 * of a context that was (already) registered by the `useAssistantOverlay` hook. You may
 * optionally override the default text.
 *
 * USE THIS WHEN: all the data necessary to start a new chat is NOT available
 * in the same part of the React tree as the button. When paired
 * with the `useAssistantOverlay` hook, this option enables context to be
 * registered where the data is available, and then the button can be displayed
 * in another part of the tree.
 */
export const NewChatByTitle = React.memo(NewChatByTitleComponent);

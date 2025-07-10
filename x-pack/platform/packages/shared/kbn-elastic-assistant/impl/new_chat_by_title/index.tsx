/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiButtonColor } from '@elastic/eui';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { EuiButtonEmptySizes } from '@elastic/eui/src/components/button/button_empty/button_empty';
import * as i18n from './translations';

export const BUTTON_TEST_ID = 'newChatByTitle';
export const BUTTON_ICON_TEST_ID = 'newChatByTitleIcon';
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
    <EuiButtonEmpty
      aria-label={i18n.ASK_AI_ASSISTANT}
      color={color}
      data-test-subj={BUTTON_TEST_ID}
      onClick={showOverlay}
      size={size}
    >
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <AssistantIcon data-test-subj={BUTTON_ICON_TEST_ID} size="m" />
        </EuiFlexItem>
        {text && (
          <EuiFlexItem data-test-subj={BUTTON_TEXT_TEST_ID} grow={false}>
            {text}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiButtonEmpty>
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

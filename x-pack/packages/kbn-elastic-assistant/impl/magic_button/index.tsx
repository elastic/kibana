/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useMemo } from 'react';

import { PromptContext } from '../assistant/prompt_context/types';
import { useAssistantOverlay } from '../assistant/use_assistant_overlay';

const MagicButtonComponent: React.FC<{
  promptContext?: Omit<PromptContext, 'id'>;
  promptContextId?: string;
  conversationId?: string;
}> = ({ conversationId, promptContext, promptContextId }) => {
  const { showAssistantOverlay } = useAssistantOverlay({
    conversationId,
    promptContextId,
    promptContext,
  });

  const showOverlay = useCallback(() => {
    showAssistantOverlay(true);
  }, [showAssistantOverlay]);

  return useMemo(
    () => (
      <EuiButtonEmpty
        onClick={showOverlay}
        css={css`
          font-size: 24px;
        `}
      >
        {'🪄✨'}
      </EuiButtonEmpty>
    ),
    [showOverlay]
  );
};

MagicButtonComponent.displayName = 'MagicButtonComponent';

export const MagicButton = React.memo(MagicButtonComponent);

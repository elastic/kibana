/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { css } from '@emotion/react';
import type { TriggerMatchResult } from './types';
import { isExperimentalFeaturesEnabled } from '../../../../../utils/is_experimental_features_enabled';
import { InlineActionPopover } from './inline_action_popover';
import { useInlineActionsMenuAnchor } from './use_inline_actions_menu_anchor';
import { useKibana } from '../../../../../hooks/use_kibana';

const containerStyles = css`
  position: relative;
  flex-grow: 1;
  height: 100%;
`;

interface InlineActionsContainerProps {
  triggerMatch: TriggerMatchResult;
  onClose: () => void;
  editorRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
  'data-test-subj'?: string;
}

export const InlineActionsContainer: React.FC<InlineActionsContainerProps> = ({
  triggerMatch,
  onClose,
  editorRef,
  children,
  'data-test-subj': dataTestSubj,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorPosition = useInlineActionsMenuAnchor({
    triggerMatch,
    editorRef,
    containerRef,
  });

  const {
    services: { settings },
  } = useKibana();

  return (
    <div ref={containerRef} css={containerStyles} data-test-subj={dataTestSubj}>
      {children}
      {isExperimentalFeaturesEnabled(settings.client) && (
        <InlineActionPopover
          triggerMatch={triggerMatch}
          onClose={onClose}
          anchorPosition={anchorPosition}
        />
      )}
    </div>
  );
};

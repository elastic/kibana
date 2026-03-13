/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { css } from '@emotion/react';
import type { TriggerMatchResult } from './types';
import { CommandMenuPopover } from './command_menu_popover';
import { useCommandMenuAnchor } from './use_command_menu_anchor';
import { useExperimentalFeatures } from '../../../../../hooks/use_experimental_features';

const containerStyles = css`
  position: relative;
  flex-grow: 1;
  height: 100%;
`;

interface CommandMenuContainerProps {
  triggerMatch: TriggerMatchResult;
  editorRef: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
  'data-test-subj'?: string;
}

export const CommandMenuContainer: React.FC<CommandMenuContainerProps> = ({
  triggerMatch,
  editorRef,
  children,
  'data-test-subj': dataTestSubj,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorPosition = useCommandMenuAnchor({
    triggerMatch,
    editorRef,
    containerRef,
  });

  const isExperimentalFeaturesEnabled = useExperimentalFeatures();

  return (
    <div ref={containerRef} css={containerStyles} data-test-subj={dataTestSubj}>
      {children}
      {isExperimentalFeaturesEnabled && (
        <CommandMenuPopover triggerMatch={triggerMatch} anchorPosition={anchorPosition} />
      )}
    </div>
  );
};

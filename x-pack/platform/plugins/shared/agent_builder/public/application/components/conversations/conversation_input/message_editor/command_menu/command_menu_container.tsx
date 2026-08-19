/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import { css } from '@emotion/react';
import type { CommandMatchResult, CommandMenuHandle, CommandBadgeData } from './types';
import { CommandMenuPopover } from './command_menu_popover';
import { useCommandMenuAnchor } from './use_command_menu_anchor';

const containerStyles = css`
  position: relative;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

interface CommandMenuContainerProps {
  commandMatch: CommandMatchResult;
  editorRef: React.RefObject<HTMLDivElement>;
  onSelect: (selection: CommandBadgeData) => void;
  onContentChange: (hasVisibleContent: boolean, forQuery: string) => void;
  commandMenuRef: React.RefObject<CommandMenuHandle>;
  children: React.ReactNode;
  'data-test-subj'?: string;
}

export const CommandMenuContainer: React.FC<CommandMenuContainerProps> = ({
  commandMatch,
  editorRef,
  onSelect,
  onContentChange,
  commandMenuRef,
  children,
  'data-test-subj': dataTestSubj,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const anchorPosition = useCommandMenuAnchor({
    commandMatch,
    editorRef,
    containerRef,
  });

  return (
    <div ref={containerRef} css={containerStyles} data-test-subj={dataTestSubj}>
      {children}
      <CommandMenuPopover
        commandMatch={commandMatch}
        anchorPosition={anchorPosition}
        onSelect={onSelect}
        onContentChange={onContentChange}
        commandMenuRef={commandMenuRef}
      />
    </div>
  );
};

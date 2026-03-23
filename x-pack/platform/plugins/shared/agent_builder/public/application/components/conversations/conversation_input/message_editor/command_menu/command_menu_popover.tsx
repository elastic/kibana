/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiPopover, EuiScreenReaderLive } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  CommandMatchResult,
  AnchorPosition,
  CommandMenuHandle,
  CommandBadgeData,
} from './types';

interface CommandMenuPopoverProps {
  commandMatch: CommandMatchResult;
  anchorPosition: AnchorPosition | null;
  onSelect: (selection: CommandBadgeData) => void;
  commandMenuRef: React.RefObject<CommandMenuHandle>;
  'data-test-subj'?: string;
}

const wrapperStyles = css`
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
`;

const anchorStyles = css`
  display: block;
  width: 0;
  height: 0;
`;

export const CommandMenuPopover: React.FC<CommandMenuPopoverProps> = ({
  commandMatch,
  anchorPosition,
  onSelect,
  commandMenuRef,
  'data-test-subj': dataTestSubj = 'commandMenuPopover',
}) => {
  const { activeCommand, isActive } = commandMatch;
  const isOpen = isActive && activeCommand !== null && anchorPosition !== null;
  let announcementText = '';
  let panelAriaLabel = '';
  if (activeCommand) {
    const { name } = activeCommand.command;
    announcementText = i18n.translate(
      'xpack.agentBuilder.conversationInput.inlineActionPopover.openedAnnouncement',
      { defaultMessage: '{name} suggestions opened. Press Escape to close.', values: { name } }
    );
    panelAriaLabel = i18n.translate(
      'xpack.agentBuilder.conversationInput.inlineActionPopover.panelLabel',
      { defaultMessage: '{name} suggestions', values: { name } }
    );
  }

  return (
    <div
      css={wrapperStyles}
      style={{ left: anchorPosition?.left ?? 0, top: anchorPosition?.top ?? 0 }}
      data-test-subj={`${dataTestSubj}-anchor`}
    >
      <EuiScreenReaderLive isActive={isOpen}>{announcementText}</EuiScreenReaderLive>
      <EuiPopover
        button={<span css={anchorStyles} />}
        isOpen={isOpen}
        closePopover={() => {
          // Do nothing
          // The popover does not control its own visibility state.
          // The external state of commandMatch controls this popover's visibility.
        }}
        anchorPosition="upLeft"
        panelPaddingSize="none"
        panelProps={{ 'aria-label': panelAriaLabel }}
        data-test-subj={dataTestSubj}
        ownFocus={false}
        display="block"
      >
        {activeCommand && (
          <div data-test-subj={`${dataTestSubj}-content`}>
            <activeCommand.command.menuComponent
              ref={commandMenuRef}
              query={activeCommand.query}
              onSelect={onSelect}
            />
          </div>
        )}
      </EuiPopover>
    </div>
  );
};

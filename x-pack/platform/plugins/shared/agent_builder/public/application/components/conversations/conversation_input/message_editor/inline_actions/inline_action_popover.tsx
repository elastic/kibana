/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiPopover, EuiScreenReaderLive, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TriggerMatchResult, AnchorPosition, InlineActionKind } from './types';

interface InlineActionPopoverProps {
  triggerMatch: TriggerMatchResult;
  onClose: () => void;
  anchorPosition: AnchorPosition | null;
  'data-test-subj'?: string;
}

const placeholderLabel = i18n.translate(
  'xpack.agentBuilder.conversationInput.inlineActionPopover.placeholder',
  { defaultMessage: 'Inline actions' }
);

const announcementsByKind: Record<InlineActionKind, string> = {
  mention: i18n.translate(
    'xpack.agentBuilder.conversationInput.inlineActionPopover.mentionAnnouncement',
    { defaultMessage: 'Mention suggestions opened. Press Escape to close.' }
  ),
  command: i18n.translate(
    'xpack.agentBuilder.conversationInput.inlineActionPopover.commandAnnouncement',
    { defaultMessage: 'Command suggestions opened. Press Escape to close.' }
  ),
};

const panelLabelsByKind: Record<InlineActionKind, string> = {
  mention: i18n.translate(
    'xpack.agentBuilder.conversationInput.inlineActionPopover.mentionPanelLabel',
    { defaultMessage: 'Mention suggestions' }
  ),
  command: i18n.translate(
    'xpack.agentBuilder.conversationInput.inlineActionPopover.commandPanelLabel',
    { defaultMessage: 'Command suggestions' }
  ),
};

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

export const InlineActionPopover: React.FC<InlineActionPopoverProps> = ({
  triggerMatch,
  onClose,
  anchorPosition,
  'data-test-subj': dataTestSubj = 'inlineActionPopover',
}) => {
  const { activeTrigger } = triggerMatch;
  const isOpen = activeTrigger !== null && anchorPosition !== null;
  const kind = activeTrigger?.trigger.kind;
  const announcementText = kind ? announcementsByKind[kind] : '';
  const panelAriaLabel = kind ? panelLabelsByKind[kind] : '';

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
        closePopover={onClose}
        anchorPosition="upLeft"
        panelPaddingSize="s"
        panelProps={{ 'aria-label': panelAriaLabel }}
        data-test-subj={dataTestSubj}
        ownFocus={false}
        display="block"
      >
        <EuiText size="s" data-test-subj={`${dataTestSubj}-content`}>
          {placeholderLabel}: {activeTrigger?.trigger.kind} &quot;{activeTrigger?.query}&quot;
        </EuiText>
      </EuiPopover>
    </div>
  );
};

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
import type { TriggerMatchResult, AnchorPosition } from './types';
import { TriggerId } from './types';

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

const announcementsById: Record<TriggerId, string> = {
  [TriggerId.Attachment]: i18n.translate(
    'xpack.agentBuilder.conversationInput.inlineActionPopover.attachmentAnnouncement',
    { defaultMessage: 'Attachment suggestions opened. Press Escape to close.' }
  ),
  [TriggerId.Prompt]: i18n.translate(
    'xpack.agentBuilder.conversationInput.inlineActionPopover.promptAnnouncement',
    { defaultMessage: 'Prompt suggestions opened. Press Escape to close.' }
  ),
};

const panelLabelsById: Record<TriggerId, string> = {
  [TriggerId.Attachment]: i18n.translate(
    'xpack.agentBuilder.conversationInput.inlineActionPopover.attachmentPanelLabel',
    { defaultMessage: 'Attachment suggestions' }
  ),
  [TriggerId.Prompt]: i18n.translate(
    'xpack.agentBuilder.conversationInput.inlineActionPopover.promptPanelLabel',
    { defaultMessage: 'Prompt suggestions' }
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
  const triggerId = activeTrigger?.trigger.id;
  let announcementText = '';
  let panelAriaLabel = '';
  if (triggerId) {
    announcementText = announcementsById[triggerId];
    panelAriaLabel = panelLabelsById[triggerId];
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
        closePopover={onClose}
        anchorPosition="upLeft"
        panelPaddingSize="s"
        panelProps={{ 'aria-label': panelAriaLabel }}
        data-test-subj={dataTestSubj}
        ownFocus={false}
        display="block"
      >
        <EuiText size="s" data-test-subj={`${dataTestSubj}-content`}>
          {placeholderLabel}: {activeTrigger?.trigger.id} &quot;{activeTrigger?.query}&quot;
        </EuiText>
      </EuiPopover>
    </div>
  );
};

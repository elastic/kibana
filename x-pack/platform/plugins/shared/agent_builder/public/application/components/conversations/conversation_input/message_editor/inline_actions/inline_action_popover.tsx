/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiPopover, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TriggerMatchResult } from './types';

export interface AnchorPosition {
  readonly left: number;
  readonly top: number;
}

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
  const { isActive, activeTrigger } = triggerMatch;

  const wrapperStyles = css`
    position: absolute;
    left: ${anchorPosition?.left ?? 0}px;
    top: ${anchorPosition?.top ?? 0}px;
    width: 0;
    height: 0;
    pointer-events: none;
  `;

  return (
    <div css={wrapperStyles} data-test-subj={`${dataTestSubj}-anchor`}>
      <EuiPopover
        button={<span css={anchorStyles} />}
        isOpen={isActive && anchorPosition !== null}
        closePopover={onClose}
        anchorPosition="upLeft"
        panelPaddingSize="s"
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  useEuiTheme,
  euiTextBreakWord,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type {
  Attachment,
  AttachmentVersionRef,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { ROUNDED_BORDER_RADIUS_LARGE } from '../../../../common.styles';
import { RoundResponseActions } from './round_response/round_response_actions';
import { RoundAttachmentReferences } from './round_attachment_references';
import { CommandBadgeText } from './command_badge_text';

const labels = {
  userMessage: i18n.translate('xpack.agentBuilder.round.userInput', {
    defaultMessage: 'User input',
  }),
};

interface RoundInputProps {
  input: string;
  attachmentRefs?: AttachmentVersionRef[];
  conversationAttachments?: VersionedAttachment[];
  fallbackAttachments?: Attachment[];
  conversationId?: string;
}

export const RoundInput = ({
  input,
  attachmentRefs,
  conversationAttachments,
  fallbackAttachments,
  conversationId,
}: RoundInputProps) => {
  const { euiTheme } = useEuiTheme();
  const [isHovering, setIsHovering] = useState(false);

  const roundInputBlockStyles = css`
    width: 100%;
    max-width: 100%;
  `;

  const inputContainerStyles = css`
    width: 100%;
    max-width: 100%;
    background: ${euiTheme.colors.backgroundLightPrimary};
    ${euiTextBreakWord()}
    white-space: pre-wrap;
    border-radius: ${ROUNDED_BORDER_RADIUS_LARGE};
  `;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      alignItems="stretch"
      css={roundInputBlockStyles}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <EuiFlexItem grow={false} css={roundInputBlockStyles}>
        <EuiPanel
          css={inputContainerStyles}
        paddingSize="m"
        hasShadow={false}
        hasBorder={false}
        aria-label={labels.userMessage}
      >
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              <CommandBadgeText text={input} />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem grow={false} css={roundInputBlockStyles}>
        <RoundAttachmentReferences
          attachmentRefs={attachmentRefs}
          conversationAttachments={conversationAttachments}
          fallbackAttachments={fallbackAttachments}
          actorFilter={[ATTACHMENT_REF_ACTOR.user]}
          justifyContent="flexEnd"
          conversationId={conversationId}
          variant="compact"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <RoundResponseActions content={input} isVisible={isHovering} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

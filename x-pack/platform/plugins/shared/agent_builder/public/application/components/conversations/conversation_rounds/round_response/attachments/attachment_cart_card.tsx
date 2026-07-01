/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/css';
import {
  EuiButtonIcon,
  EuiCard,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useState } from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import { useAttachmentCartActivation } from './use_attachment_cart_activation';
import { useUnpinAttachment } from './use_unpin_attachment';

const GROUP_ATTACHMENT_TYPE = 'group';
const DEFAULT_ICON = 'document';
const GROUP_ICON = 'boxesVertical';

const moreActionsAriaLabel = i18n.translate(
  'xpack.agentBuilder.attachmentCartCard.moreActionsAriaLabel',
  {
    defaultMessage: 'Pinned item actions',
  }
);

const unpinLabel = i18n.translate('xpack.agentBuilder.attachmentCartCard.unpinLabel', {
  defaultMessage: 'Unpin',
});

export interface AttachmentCartCardProps {
  attachment: UnknownAttachment;
}

export const AttachmentCartCard: React.FC<AttachmentCartCardProps> = ({ attachment }) => {
  const { attachmentsService } = useAgentBuilderServices();
  const { activateAttachment } = useAttachmentCartActivation();
  const { canUnpin, unpin } = useUnpinAttachment(attachment);
  const { euiTheme } = useEuiTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const isGroupAttachment = attachment.type === GROUP_ATTACHMENT_TYPE;
  const uiDefinition = !isGroupAttachment
    ? attachmentsService.getAttachmentUiDefinition(attachment.type)
    : null;

  const isActivatable =
    uiDefinition != null &&
    (uiDefinition.getActionButtons !== undefined || uiDefinition.renderCanvasContent !== undefined);

  const groupLabel =
    isGroupAttachment && typeof attachment.data === 'object' && attachment.data !== null
      ? (attachment.data as { label?: string }).label
      : undefined;

  const displayName = isGroupAttachment
    ? groupLabel ?? attachment.type
    : uiDefinition?.getLabel(attachment) ?? attachment.type;

  const iconType = isGroupAttachment ? GROUP_ICON : uiDefinition?.getIcon?.() ?? DEFAULT_ICON;

  const subtitle = !isGroupAttachment
    ? uiDefinition?.getHeader?.({ attachment })?.subtitle
    : undefined;

  const handleActivate = useCallback(() => {
    if (!isActivatable) {
      return;
    }
    activateAttachment(attachment);
  }, [activateAttachment, attachment, isActivatable]);

  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  const handleUnpin = useCallback(() => {
    closePopover();
    void unpin();
  }, [closePopover, unpin]);

  const togglePopover = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsPopoverOpen((open) => !open);
  }, []);

  const showActionsMenu = canUnpin && (isHovered || isPopoverOpen);

  const cardWrapperStyles = css`
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  `;

  const cardStyles = css`
    flex: 1 1 auto;
    height: 100%;
  `;

  const actionsMenuStyles = css`
    position: absolute;
    top: ${euiTheme.size.s};
    right: ${euiTheme.size.s};
    z-index: 1;
  `;

  return (
    <div
      className={cardWrapperStyles}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!isPopoverOpen) {
          setIsHovered(false);
        }
      }}
    >
      <EuiCard
        className={cardStyles}
        hasBorder
        display="plain"
        textAlign="left"
        titleSize="xs"
        titleElement="h4"
        title={displayName}
        description={subtitle}
        icon={<EuiIcon type={iconType} size="l" color="subdued" aria-hidden={true} />}
        onClick={isActivatable ? handleActivate : undefined}
        data-test-subj={`agentBuilderAttachmentCartCard-${attachment.id}`}
      />
      {showActionsMenu ? (
        <div className={actionsMenuStyles}>
          <EuiPopover
            button={
              <EuiButtonIcon
                iconType="boxesHorizontal"
                size="xs"
                color="text"
                aria-label={moreActionsAriaLabel}
                aria-expanded={isPopoverOpen}
                onClick={togglePopover}
                data-test-subj={`agentBuilderAttachmentCartCardActions-${attachment.id}`}
              />
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downRight"
            onClick={(event) => event.stopPropagation()}
          >
            <EuiContextMenuPanel
              items={[
                <EuiContextMenuItem
                  key="unpin"
                  icon="pin"
                  onClick={handleUnpin}
                  data-test-subj={`agentBuilderAttachmentCartCardUnpin-${attachment.id}`}
                  {...getEbtProps({
                    element: AGENT_BUILDER_UI_EBT.element.pageContent,
                    action: AGENT_BUILDER_UI_EBT.action.conversation.REMOVE_ATTACHMENT,
                    detail: 'attachmentCart',
                  })}
                >
                  {unpinLabel}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        </div>
      ) : null}
    </div>
  );
};

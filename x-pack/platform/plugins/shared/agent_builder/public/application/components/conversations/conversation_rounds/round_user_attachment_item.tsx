/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiIcon, useEuiTheme, type IconType } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import {
  getAttachmentPreviewKey,
  useCanvasContext,
} from './round_response/attachments/canvas_context';

/* ----------------------------------------------------------------------- *
 * Compact attachment pill rendered inside the "Show attachments" row
 * under a user message.
 *
 * Mirrors the visual recipe used by the message editor's command-badge
 * (see
 * `conversation_input/message_editor/message_editor.tsx` — the
 * `commandBadgeStyles` block): `inline-flex`, primary-tinted
 * background (`backgroundLightPrimary`), primary text colour, small
 * border-radius, tight horizontal padding. Two intentional
 * differences:
 *  - this pill is *clickable* (the whole surface opens the canvas
 *    for the attachment), so we render it as a `<button>` with hover
 *    + focus rings, whereas the command badge is read-only;
 *  - we lead with the attachment-type icon (from
 *    `AttachmentUIDefinition.getIcon`) so the type is scannable at a
 *    glance — same role the leading icon tile plays on the larger
 *    inline cards (`InlineAttachmentWithActions`).
 *
 * Parent (`RoundAttachmentReferences`) lays these pills out in a
 * wrapping flex row so they read like `@mention` chips: as many fit
 * per line as the row's width allows, the rest flow to the next line.
 * ----------------------------------------------------------------------- */

const PILL_MAX_WIDTH_CH = 28;

const expandAriaLabel = (title: string) =>
  i18n.translate('xpack.agentBuilder.roundUserAttachmentItem.openAttachment', {
    defaultMessage: 'Open attachment {title}',
    values: { title },
  });

export interface RoundUserAttachmentItemProps {
  attachment: UnknownAttachment;
  version: number;
}

export const RoundUserAttachmentItem: React.FC<RoundUserAttachmentItemProps> = ({
  attachment,
  version,
}) => {
  const { euiTheme } = useEuiTheme();
  const { attachmentsService } = useAgentBuilderServices();
  const { openCanvas, previewedAttachmentKey } = useCanvasContext();

  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);

  const title = uiDefinition?.getLabel?.(attachment) ?? attachment.type;
  const iconType: IconType = uiDefinition?.getIcon?.() ?? 'document';

  /*
   * `previewedAttachmentKey` is set by `openCanvas` to
   * `${attachmentId}:${version}` (see `canvas_context.tsx`). When it
   * matches this pill's key, the canvas flyout is currently showing
   * the same attachment — apply a stronger primary background +
   * inset ring so the pill reads as "this is what's open".
   */
  const isSelected =
    previewedAttachmentKey === getAttachmentPreviewKey(attachment.id, version);

  const onClick = useCallback(() => {
    openCanvas(attachment, false, version);
  }, [attachment, openCanvas, version]);

  if (!uiDefinition) {
    return null;
  }

  const pillStyles = css`
    /* Match the command-badge visual recipe from the message editor
     * so attachment pills and the in-prompt @mention / slash-command
     * badges read as the same family. */
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    /* No border + transparent default — the primary-tinted background
     * provides the affordance, and removing the outline keeps the
     * pill flush against neighbours on the same row. */
    border: 0;
    appearance: none;
    color: ${euiTheme.colors.textPrimary};
    background-color: ${isSelected
      ? euiTheme.colors.backgroundBasePrimary
      : euiTheme.colors.backgroundLightPrimary};
    border-radius: ${euiTheme.border.radius.small};
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    line-height: 1.4286rem;
    font-size: 0.875rem;
    font-family: inherit;
    font-weight: ${isSelected
      ? euiTheme.font.weight.semiBold
      : euiTheme.font.weight.regular};
    cursor: pointer;
    max-width: ${PILL_MAX_WIDTH_CH}ch;
    min-width: 0;
    /*
     * Selected pill draws an inset primary ring so the affordance
     * remains visible even on the deeper background — an outside
     * 'outline' would clip against neighbour pills on the same row,
     * so the inset ring keeps the layout intact.
     */
    box-shadow: ${isSelected
      ? `inset 0 0 0 1px ${euiTheme.colors.primary}`
      : 'none'};
    transition:
      background-color 120ms ease-in-out,
      box-shadow 120ms ease-in-out;

    &:hover {
      background-color: ${isSelected
        ? euiTheme.colors.backgroundBasePrimary
        : euiTheme.colors.backgroundBasePrimary};
    }
    &:focus-visible {
      outline: 2px solid ${euiTheme.colors.primary};
      outline-offset: 1px;
    }
  `;

  const labelStyles = css`
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: 0;
  `;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={expandAriaLabel(title)}
      aria-pressed={isSelected}
      title={title}
      data-test-subj={`agentBuilderRoundUserAttachment-${attachment.id}`}
      data-selected={isSelected ? 'true' : 'false'}
      css={pillStyles}
    >
      <EuiIcon type={iconType} size="s" color={euiTheme.colors.primary} aria-hidden />
      <span css={labelStyles}>{title}</span>
    </button>
  );
};

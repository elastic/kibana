/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiToolTip,
  euiTextTruncate,
  useEuiFontSize,
  useEuiTheme,
  useResizeObserver,
} from '@elastic/eui';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { toRenderAttachment } from './to_render_attachment';
import { attachmentSummaryRowAriaLabel } from './translations';

const FALLBACK_ICON = 'document';

export interface AttachmentSummaryRowProps {
  attachment: VersionedAttachment;
  /** Display name of the attachment's kind, e.g. "Alert". */
  typeName: string;
  attachmentsService: AttachmentServiceStartContract;
  /** A divider above every row but the first. */
  hasTopBorder: boolean;
  /** Asks the list to open this attachment's drill-down; the list owns the mounting. */
  onActivate: () => void;
}

/**
 * One attachment in the summary. A type that registered no drill-down stays read-only, but a
 * type registers one for all of its attachments, so a row can be clickable and still open
 * nothing when the payload identifies nothing.
 */
export const AttachmentSummaryRow = memo<AttachmentSummaryRowProps>(
  ({ attachment, typeName, attachmentsService, hasTopBorder, onActivate }) => {
    const { euiTheme } = useEuiTheme();
    const { fontSize } = useEuiFontSize('s');

    const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);

    const renderedAttachment = useMemo(() => toRenderAttachment(attachment), [attachment]);

    // A type whose UI definition was never registered has no label of its own: `security.rule`
    // is gated on the `aiRuleCreationEnabled` experimental feature.
    const label =
      uiDefinition?.getLabel(renderedAttachment) || attachment.description || attachment.type;
    const iconType = uiDefinition?.getIcon?.() ?? FALLBACK_ICON;

    // A plain element rather than EuiText: EuiText does not forward a ref, and the element that
    // ellipsizes is the one that has to be measured.
    const [labelElement, setLabelElement] = useState<HTMLDivElement | null>(null);
    const { width: labelWidth } = useResizeObserver(labelElement, 'width');
    const [isLabelTruncated, setIsLabelTruncated] = useState(false);

    useEffect(() => {
      // CSS truncation leaves no trace in the props, so the rendered width is the only signal.
      setIsLabelTruncated(
        labelElement ? labelElement.scrollWidth > labelElement.clientWidth : false
      );
    }, [labelElement, labelWidth, label]);

    const labelStyles = css`
      ${euiTextTruncate()}
      font-size: ${fontSize};
      font-weight: ${euiTheme.font.weight.semiBold};
    `;

    const hasDrilldown = Boolean(uiDefinition?.renderConversationDetailsContent);

    const padding = `${euiTheme.size.s} ${euiTheme.size.base}`;

    const content = (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {/* `name` does the work here: EuiAvatar renders it as the hover tooltip and as the
              element's aria-label, which is why the kind rather than the row's own title
              belongs in it. Omitting `type` keeps the avatar a circle. */}
          <EuiAvatar
            name={typeName}
            iconType={iconType}
            iconSize="s"
            size="s"
            color={euiTheme.colors.backgroundBasePrimary}
            iconColor={euiTheme.colors.textPrimary}
            data-test-subj="attachmentSummaryRowIcon"
          />
        </EuiFlexItem>

        {/* Without min-inline-size the flex item's `auto` minimum defeats the truncation, and
            the tooltip's anchor needs the same treatment to stay out of its way. */}
        <EuiFlexItem css={css({ minInlineSize: 0 })}>
          {isLabelTruncated ? (
            <EuiToolTip
              content={label}
              position="top"
              anchorProps={{ css: css({ display: 'block', minInlineSize: 0 }) }}
            >
              {/* Focusable only while cut off, and never inside the button: that is already a
                  tab stop and cannot legally nest a focusable child. */}
              <div
                ref={setLabelElement}
                tabIndex={hasDrilldown ? undefined : 0}
                data-test-subj="attachmentSummaryRowLabel"
                css={labelStyles}
              >
                {label}
              </div>
            </EuiToolTip>
          ) : (
            <div ref={setLabelElement} data-test-subj="attachmentSummaryRowLabel" css={labelStyles}>
              {label}
            </div>
          )}
        </EuiFlexItem>

        {/* The chevron reads as a promise of a drill-down, so a row without one does not show it. */}
        {hasDrilldown ? (
          <EuiFlexItem grow={false}>
            <EuiIcon type="chevronSingleRight" color="subdued" size="s" aria-hidden={true} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );

    return (
      <EuiFlexItem
        component="li"
        grow={false}
        css={css({ borderTop: hasTopBorder ? euiTheme.border.thin : undefined })}
        data-test-subj="attachmentSummaryRow"
      >
        {hasDrilldown ? (
          <EuiPanel
            element="button"
            type="button"
            hasShadow={false}
            hasBorder={false}
            borderRadius="none"
            color="transparent"
            paddingSize="none"
            onClick={onActivate}
            aria-label={attachmentSummaryRowAriaLabel(typeName, label)}
            data-test-subj="attachmentSummaryRowButton"
            css={css({
              padding,
              // EuiPanel's clickable treatment is a drop shadow, which would lift a row out of
              // the flat list it belongs to. Dropped on hover only: the same shadow is what
              // marks the row as focused, and a keyboard user has nothing else to go on.
              '&:hover': {
                boxShadow: 'none',
                backgroundColor: euiTheme.colors.backgroundBaseSubdued,
              },
            })}
          >
            {content}
          </EuiPanel>
        ) : (
          <div css={css({ padding })}>{content}</div>
        )}
      </EuiFlexItem>
    );
  }
);

AttachmentSummaryRow.displayName = 'AttachmentSummaryRow';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
  euiTextTruncate,
  useEuiFontSize,
  useEuiTheme,
  useResizeObserver,
} from '@elastic/eui';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { toRenderAttachment } from './to_render_attachment';

const FALLBACK_ICON = 'document';

export interface AttachmentSummaryRowProps {
  attachment: VersionedAttachment;
  /** Display name of the attachment's kind, e.g. "Alert". */
  typeName: string;
  attachmentsService: AttachmentServiceStartContract;
  /** A divider above every row but the first. */
  hasTopBorder: boolean;
}

/**
 * One attachment in the summary. Read-only for now: the chevron marks where the drill-down will
 * land, so the row is deliberately neither clickable nor focusable as a whole.
 */
export const AttachmentSummaryRow = memo<AttachmentSummaryRowProps>(
  ({ attachment, typeName, attachmentsService, hasTopBorder }) => {
    const { euiTheme } = useEuiTheme();
    const { fontSize } = useEuiFontSize('s');

    const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);

    // A type whose UI definition was never registered has no label of its own: `security.rule`
    // is gated on the `aiRuleCreationEnabled` experimental feature.
    const label =
      uiDefinition?.getLabel(toRenderAttachment(attachment)) ||
      attachment.description ||
      attachment.type;
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

    return (
      <EuiFlexItem
        component="li"
        grow={false}
        css={css({
          padding: `${euiTheme.size.s} ${euiTheme.size.base}`,
          borderTop: hasTopBorder ? euiTheme.border.thin : undefined,
        })}
        data-test-subj="attachmentSummaryRow"
      >
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
                {/* Focusable only while cut off, so a row whose label already reads in full
                    does not become a pointless tab stop. */}
                <div
                  ref={setLabelElement}
                  tabIndex={0}
                  data-test-subj="attachmentSummaryRowLabel"
                  css={labelStyles}
                >
                  {label}
                </div>
              </EuiToolTip>
            ) : (
              <div
                ref={setLabelElement}
                data-test-subj="attachmentSummaryRowLabel"
                css={labelStyles}
              >
                {label}
              </div>
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiIcon type="chevronSingleRight" color="subdued" size="s" aria-hidden={true} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    );
  }
);

AttachmentSummaryRow.displayName = 'AttachmentSummaryRow';

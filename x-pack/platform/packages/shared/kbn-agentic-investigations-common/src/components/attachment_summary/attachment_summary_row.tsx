/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
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
}

/**
 * One attachment in the summary. Clicking the row opens whatever flyout the attachment's own
 * plugin registered as its conversation-details content; a type that registered none stays
 * read-only rather than becoming a button that does nothing.
 */
export const AttachmentSummaryRow = memo<AttachmentSummaryRowProps>(
  ({ attachment, typeName, attachmentsService, hasTopBorder }) => {
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

    // Each click remounts the drill-down, so clicking the same row twice reopens its flyout.
    const [activationCount, setActivationCount] = useState(0);
    const openDrilldown = useCallback(() => setActivationCount((count) => count + 1), []);

    // A type can register a drill-down that only some of its attachments carry enough to open —
    // an alert whose payload never recorded its index, say. Asking per attachment keeps the row
    // inert in those cases instead of offering a click that quietly does nothing.
    const renderDrilldown =
      uiDefinition?.hasConversationDetailsContent?.(renderedAttachment) ?? true
        ? uiDefinition?.renderConversationDetailsContent
        : undefined;

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
              {/* Focusable only while cut off, so a row whose label already reads in full
                    does not become a pointless tab stop — and never once the row itself is a
                    button, which already stops here and cannot legally nest a focusable child. */}
              <div
                ref={setLabelElement}
                tabIndex={renderDrilldown ? undefined : 0}
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

        {/* The chevron promises a drill-down, so a row that has none does not show one. */}
        {renderDrilldown ? (
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
        css={css({
          borderTop: hasTopBorder ? euiTheme.border.thin : undefined,
        })}
        data-test-subj="attachmentSummaryRow"
      >
        {renderDrilldown ? (
          <EuiPanel
            element="button"
            type="button"
            hasShadow={false}
            hasBorder={false}
            borderRadius="none"
            color="transparent"
            paddingSize="none"
            onClick={openDrilldown}
            aria-label={attachmentSummaryRowAriaLabel(typeName, label)}
            data-test-subj="attachmentSummaryRowButton"
            css={css({
              padding,
              // EuiPanel's clickable treatment is a drop shadow, which would lift a row out of
              // the flat list it belongs to.
              '&:hover, &:focus': { boxShadow: 'none' },
              '&:hover': { backgroundColor: euiTheme.colors.backgroundBaseSubdued },
            })}
          >
            {content}
          </EuiPanel>
        ) : (
          <div css={css({ padding })}>{content}</div>
        )}

        {/* The drill-down is mounted for its side effect: it opens a flyout and renders nothing
            of its own. It is kept out of view rather than placed in the row because its loading
            state is sized for a panel, not for a list row, and shrinking it would mean reaching
            into another team's component. */}
        {activationCount > 0 && renderDrilldown ? (
          <div css={css({ display: 'none' })} key={activationCount}>
            {renderDrilldown({ attachment: renderedAttachment })}
          </div>
        ) : null}
      </EuiFlexItem>
    );
  }
);

AttachmentSummaryRow.displayName = 'AttachmentSummaryRow';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiPanel,
  EuiToolTip,
  euiTextTruncate,
  useEuiTheme,
  useResizeObserver,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { attachmentSummaryRowAriaLabel } from './translations';

const FALLBACK_ICON = 'document';

export interface AttachmentSummaryRowProps {
  /** Human-readable label for this row, e.g. the alert name or entity id. */
  label: string;
  /** Display name of the attachment's kind, e.g. "Alert". Used only for the aria-label. */
  typeName: string;
  /** Icon type. Defaults to "document". */
  iconType?: IconType;
  /** Icon color passed directly to EuiIcon. */
  iconColor?: string;
  /** Tooltip shown on the icon. Defaults to typeName when absent. */
  iconLabel?: string;
  /** When provided the row becomes a clickable button with a chevron. */
  onClick?: () => void;
  /** Rendered inside the <li>, after the visible row content, for hidden side-effect nodes. */
  children?: React.ReactNode;
}

/** One row in the attachment summary. */
export const AttachmentSummaryRow = memo<AttachmentSummaryRowProps>(
  ({ label, typeName, iconType = FALLBACK_ICON, iconColor, iconLabel, onClick, children }) => {
    const { euiTheme } = useEuiTheme();

    const [labelElement, setLabelElement] = useState<HTMLDivElement | null>(null);
    const { width: labelWidth } = useResizeObserver(labelElement, 'width');
    const [isLabelTruncated, setIsLabelTruncated] = useState(false);

    useEffect(() => {
      setIsLabelTruncated(
        labelElement ? labelElement.scrollWidth > labelElement.clientWidth : false
      );
    }, [labelElement, labelWidth, label]);

    const labelStyles = css`
      ${euiTextTruncate()}
      font-size: 14px;
      line-height: 20px;
      font-weight: ${euiTheme.font.weight.medium};
      color: ${euiTheme.colors.textParagraph};
    `;

    const hasDrilldown = Boolean(onClick);
    const padding = `12px ${euiTheme.size.base}`;

    const content = (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIconTip
            type={iconType}
            color={iconColor}
            size="s"
            content={iconLabel ?? typeName}
            position="top"
            iconProps={{
              'data-test-subj': 'attachmentSummaryRowIcon',
              'aria-label': iconLabel ?? typeName,
            }}
          />
        </EuiFlexItem>

        <EuiFlexItem css={css({ minInlineSize: 0 })}>
          {isLabelTruncated ? (
            <EuiToolTip
              content={label}
              position="top"
              anchorProps={{ css: css({ display: 'block', minInlineSize: 0 }) }}
            >
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

        {hasDrilldown ? (
          <EuiFlexItem grow={false}>
            <EuiIcon type="chevronSingleRight" color="subdued" size="s" aria-hidden={true} />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    );

    return (
      <EuiFlexItem component="li" grow={false} data-test-subj="attachmentSummaryRow">
        {hasDrilldown ? (
          <EuiPanel
            element="button"
            type="button"
            hasShadow={false}
            hasBorder={false}
            borderRadius="none"
            color="transparent"
            paddingSize="none"
            onClick={onClick}
            aria-label={attachmentSummaryRowAriaLabel(typeName, label)}
            data-test-subj="attachmentSummaryRowButton"
            css={css({
              padding,
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
        {children}
      </EuiFlexItem>
    );
  }
);

AttachmentSummaryRow.displayName = 'AttachmentSummaryRow';

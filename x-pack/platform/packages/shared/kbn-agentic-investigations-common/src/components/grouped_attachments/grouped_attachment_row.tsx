/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { EuiIcon, EuiToolTip, euiTextTruncate, useEuiTheme, useResizeObserver } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { openInNewTabAriaLabel } from './translations';

const CIRCLE_SIZE_PX = 32;

export type GroupedAttachmentRowAction =
  | { kind: 'page'; href: string }
  | { kind: 'flyout'; onClick: () => void };

export interface GroupedAttachmentRowProps {
  iconType: IconType;
  iconColor: 'danger' | 'subdued';
  title: string;
  subtitle?: string;
  action: GroupedAttachmentRowAction;
  children?: React.ReactNode;
}

/** One row of a flyout grouped attachment card. */
export const GroupedAttachmentRow = memo<GroupedAttachmentRowProps>(
  ({ iconType, iconColor, title, subtitle, action, children }) => {
    const { euiTheme } = useEuiTheme();

    const [titleElement, setTitleElement] = useState<HTMLSpanElement | null>(null);
    const { width: titleWidth } = useResizeObserver(titleElement, 'width');
    const [isTitleTruncated, setIsTitleTruncated] = useState(false);

    useEffect(() => {
      setIsTitleTruncated(
        titleElement ? titleElement.scrollWidth > titleElement.clientWidth : false
      );
    }, [titleElement, titleWidth, title]);

    const rowStyles = css`
      display: grid;
      grid-template-columns: ${CIRCLE_SIZE_PX}px minmax(0, 1fr) auto;
      column-gap: 12px;
      align-items: center;
      box-sizing: border-box;
      inline-size: 100%;
      padding: 12px ${euiTheme.size.base};
      border: 0;
      background: transparent;
      color: inherit;
      text-align: start;
      text-decoration: none;
      cursor: pointer;
      transition: background 0.15s ease;

      .groupedAttachmentRowAffordance {
        opacity: 0;
      }

      &:hover,
      &:focus-visible {
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
        text-decoration: none;

        .groupedAttachmentRowAffordance {
          opacity: 1;
        }
      }

      &:focus-visible {
        outline: ${euiTheme.focus.width} solid ${euiTheme.focus.color};
        outline-offset: -${euiTheme.focus.width};
      }
    `;

    const circleStyles = css`
      display: flex;
      align-items: center;
      justify-content: center;
      inline-size: ${CIRCLE_SIZE_PX}px;
      block-size: ${CIRCLE_SIZE_PX}px;
      border-radius: 50%;
      background: ${iconColor === 'danger'
        ? euiTheme.colors.backgroundLightDanger
        : euiTheme.colors.backgroundLightText};
    `;

    const textStyles = css`
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-inline-size: 0;
    `;

    const titleStyles = css`
      margin: 0;
      font-size: 14px;
      line-height: 20px;
      font-weight: ${euiTheme.font.weight.medium};
      color: ${euiTheme.colors.textParagraph};
      display: block;
      ${euiTextTruncate()}
    `;

    const subtitleStyles = css`
      margin: 0;
      font-size: 12px;
      line-height: 16px;
      color: ${euiTheme.colors.textSubdued};
      ${euiTextTruncate()}
    `;

    const titleNode = (
      <span ref={setTitleElement} css={titleStyles} data-test-subj="groupedAttachmentRowTitle">
        {title}
      </span>
    );

    const content = (
      <>
        <span css={circleStyles} aria-hidden="true">
          <EuiIcon type={iconType} color={iconColor} aria-hidden={true} />
        </span>
        <span css={textStyles}>
          {isTitleTruncated ? (
            <EuiToolTip
              content={title}
              position="top"
              anchorProps={{ css: css({ display: 'block', minInlineSize: 0 }) }}
            >
              {titleNode}
            </EuiToolTip>
          ) : (
            titleNode
          )}
          {subtitle ? (
            <span css={subtitleStyles} data-test-subj="groupedAttachmentRowSubtitle">
              {subtitle}
            </span>
          ) : null}
        </span>
        <EuiIcon
          className="groupedAttachmentRowAffordance"
          type={action.kind === 'page' ? 'external' : 'maximize'}
          color="subdued"
          aria-hidden={true}
          data-test-subj="groupedAttachmentRowAffordance"
        />
      </>
    );

    return (
      <li data-test-subj="groupedAttachmentRow">
        {action.kind === 'page' ? (
          <a
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={openInNewTabAriaLabel(title)}
            css={rowStyles}
          >
            {content}
          </a>
        ) : (
          <button type="button" onClick={action.onClick} css={rowStyles}>
            {content}
          </button>
        )}
        {children}
      </li>
    );
  }
);

GroupedAttachmentRow.displayName = 'GroupedAttachmentRow';

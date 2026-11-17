/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiIcon,
  EuiToolTip,
  euiTextTruncate,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import { useIsTextTruncated } from '../use_is_text_truncated';
import { openInNewTabAriaLabel } from './translations';

const CIRCLE_SIZE_PX = 32;

export type GroupedAttachmentRowAction =
  | { kind: 'page'; href: string }
  | { kind: 'flyout'; onClick: () => void }
  | { kind: 'expand'; isExpanded: boolean; onToggle: () => void };

export interface GroupedAttachmentRowProps {
  iconType: IconType;
  iconColor: 'danger' | 'subdued';
  title: string;
  subtitle?: string;
  /** Absent, the row is static: no hover, no affordance, nothing to click. */
  action?: GroupedAttachmentRowAction;
  /** Rendered under the row's control, inside the same list item. */
  children?: React.ReactNode;
  'data-test-subj'?: string;
}

const affordanceIconType = (action: GroupedAttachmentRowAction): IconType => {
  switch (action.kind) {
    case 'page':
      return 'external';
    case 'flyout':
      return 'maximize';
    case 'expand':
      return action.isExpanded ? 'chevronSingleUp' : 'chevronSingleDown';
  }
};

/** One row of a flyout grouped attachment card. */
export const GroupedAttachmentRow = memo<GroupedAttachmentRowProps>(
  ({
    iconType,
    iconColor,
    title,
    subtitle,
    action,
    children,
    'data-test-subj': dataTestSubj = 'groupedAttachmentRow',
  }) => {
    const { euiTheme } = useEuiTheme();
    const bodyId = useGeneratedHtmlId({ prefix: 'groupedAttachmentRowBody' });

    const [titleElement, setTitleElement] = useState<HTMLSpanElement | null>(null);
    const isTitleTruncated = useIsTextTruncated(titleElement, title);

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
    `;

    // The expand caret stays visible so a collapsed body is discoverable; the open-elsewhere
    // affordances only show on hover, as the row title already reads as the link.
    const interactiveStyles = css`
      cursor: pointer;
      transition: background 0.15s ease;

      .groupedAttachmentRowAffordance {
        opacity: ${action?.kind === 'expand' ? 1 : 0};
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
        {action ? (
          <EuiIcon
            className="groupedAttachmentRowAffordance"
            type={affordanceIconType(action)}
            color="subdued"
            aria-hidden={true}
            data-test-subj="groupedAttachmentRowAffordance"
          />
        ) : null}
      </>
    );

    const renderControl = (): React.ReactNode => {
      if (!action) {
        return <div css={rowStyles}>{content}</div>;
      }
      switch (action.kind) {
        case 'page':
          return (
            <a
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={openInNewTabAriaLabel(title)}
              css={[rowStyles, interactiveStyles]}
            >
              {content}
            </a>
          );
        case 'flyout':
          return (
            <button type="button" onClick={action.onClick} css={[rowStyles, interactiveStyles]}>
              {content}
            </button>
          );
        case 'expand':
          return (
            <button
              type="button"
              onClick={action.onToggle}
              aria-expanded={action.isExpanded}
              aria-controls={bodyId}
              css={[rowStyles, interactiveStyles]}
            >
              {content}
            </button>
          );
      }
    };

    return (
      <li data-test-subj={dataTestSubj}>
        {renderControl()}
        {action?.kind === 'expand' ? <div id={bodyId}>{children}</div> : children}
      </li>
    );
  }
);

GroupedAttachmentRow.displayName = 'GroupedAttachmentRow';

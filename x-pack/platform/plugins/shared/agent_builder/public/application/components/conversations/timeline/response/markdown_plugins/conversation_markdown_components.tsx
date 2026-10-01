/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCodeBlock,
  EuiLink,
  EuiSpacer,
  EuiTable,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
} from '@elastic/eui';

/** Class of the spacer rendered after block elements (code blocks, tables). */
export const MARKDOWN_BLOCK_SPACER_CLASS_NAME = 'agentBuilderMarkdownBlockSpacer';

const BlockSpacer = () => <EuiSpacer size="m" className={MARKDOWN_BLOCK_SPACER_CLASS_NAME} />;

interface CodeNodeProps {
  value: string;
}

interface CreateConversationMarkdownComponentsArgs {
  onLinkClick: (href: string, e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/** Renderers shared by agent responses and user messages. */
export const createConversationMarkdownComponents = ({
  onLinkClick,
}: CreateConversationMarkdownComponentsArgs) => ({
  a: ({ href, children, type, color, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <EuiLink
      {...rest}
      href={href}
      target="_blank"
      rel="noreferrer"
      external={false}
      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
        if (href) onLinkClick(href, e);
      }}
    >
      {children}
    </EuiLink>
  ),
  codeBlock: ({ value }: CodeNodeProps) => (
    <>
      <EuiCodeBlock>{value}</EuiCodeBlock>
      <BlockSpacer />
    </>
  ),
  esql: ({ value }: CodeNodeProps) => (
    <>
      <EuiCodeBlock language="esql" isCopyable>
        {value}
      </EuiCodeBlock>
      <BlockSpacer />
    </>
  ),
  table: (props: React.ComponentProps<typeof EuiTable>) => (
    <>
      <EuiTable {...props} tableLayout="auto" scrollableInline responsiveBreakpoint={false} />
      <BlockSpacer />
    </>
  ),
  th: ({ children, ...rest }: React.ComponentProps<typeof EuiTableHeaderCell>) => (
    <EuiTableHeaderCell
      minWidth="10em"
      // This is just a recommendation and will be ignored if there aren't
      // enough columns to fill the entire container's width.
      maxWidth="30em"
      {...rest}
    >
      {children}
    </EuiTableHeaderCell>
  ),
  tr: (props: React.ComponentProps<typeof EuiTableRow>) => <EuiTableRow {...props} />,
  td: ({ children, ...rest }: React.ComponentProps<typeof EuiTableRowCell>) => (
    <EuiTableRowCell
      minWidth="10em"
      // This is just a recommendation and will be ignored if there aren't
      // enough columns to fill the entire container's width.
      maxWidth="30em"
      {...rest}
    >
      {children}
    </EuiTableRowCell>
  ),
});

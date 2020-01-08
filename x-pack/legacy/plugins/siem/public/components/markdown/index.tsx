/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiLink, EuiTableRow, EuiTableRowCell, EuiText, EuiToolTip } from '@elastic/eui';
import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';

const TableHeader = styled.thead`
  font-weight: bold;
`;

TableHeader.displayName = 'TableHeader';

/** prevents links to the new pages from accessing `window.opener` */
const REL_NOOPENER = 'noopener';

/** prevents search engine manipulation by noting the linked document is not trusted or endorsed by us */
const REL_NOFOLLOW = 'nofollow';

/** prevents the browser from sending the current address as referrer via the Referer HTTP header */
const REL_NOREFERRER = 'noreferrer';

export const Markdown = React.memo<{ raw?: string; size?: 'xs' | 's' | 'm' }>(
  ({ raw, size = 's' }) => {
    const markdownRenderers = {
      root: ({ children }: { children: React.ReactNode[] }) => (
        <EuiText data-test-subj="markdown-root" grow={true} size={size}>
          {children}
        </EuiText>
      ),
      table: ({ children }: { children: React.ReactNode[] }) => (
        <table data-test-subj="markdown-table" className="euiTable euiTable--responsive">
          {children}
        </table>
      ),
      tableHead: ({ children }: { children: React.ReactNode[] }) => (
        <TableHeader data-test-subj="markdown-table-header">{children}</TableHeader>
      ),
      tableRow: ({ children }: { children: React.ReactNode[] }) => (
        <EuiTableRow data-test-subj="markdown-table-row">{children}</EuiTableRow>
      ),
      tableCell: ({ children }: { children: React.ReactNode[] }) => (
        <EuiTableRowCell data-test-subj="markdown-table-cell">{children}</EuiTableRowCell>
      ),
      link: ({ children, href }: { children: React.ReactNode[]; href?: string }) => (
        <EuiToolTip content={href}>
          <EuiLink
            href={href}
            data-test-subj="markdown-link"
            rel={`${REL_NOOPENER} ${REL_NOFOLLOW} ${REL_NOREFERRER}`}
            target="_blank"
          >
            {children}
          </EuiLink>
        </EuiToolTip>
      ),
    };

    return (
      <ReactMarkdown
        data-test-subj="markdown"
        linkTarget="_blank"
        renderers={markdownRenderers}
        source={raw}
      />
    );
  }
);

Markdown.displayName = 'Markdown';

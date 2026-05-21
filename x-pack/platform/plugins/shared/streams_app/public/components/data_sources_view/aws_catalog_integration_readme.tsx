/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { MutableRefObject } from 'react';
import ReactMarkdown from 'react-markdown';
import type { TransformOptions } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { css } from '@emotion/react';
import {
  EuiCode,
  EuiCodeBlock,
  EuiLink,
  EuiSkeletonText,
  EuiSpacer,
  EuiTable,
  EuiTableHeaderCell,
  EuiTableRow,
  EuiTableRowCell,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { HttpSetup } from '@kbn/core/public';
import { getEpmPackageInfoApiPath } from './aws_epm_api';

const REL_NOOPENER = 'noopener';
const REL_NOFOLLOW = 'nofollow';
const REL_NOREFERRER = 'noreferrer';

export const getReadmeAnchorId = (name: string | undefined, index?: number): string => {
  if (!name) {
    return '';
  }
  const baseId = name.replaceAll(' ', '-').toLowerCase().slice(0, 12);
  return index ? `${baseId}-${index}` : baseId;
};

const markdownRenderers = (
  refs: MutableRefObject<Map<string, HTMLDivElement | null>>
): TransformOptions['components'] => ({
  table: ({ children }) => <EuiTable>{children}</EuiTable>,
  tr: ({ children }) => <EuiTableRow>{children}</EuiTableRow>,
  th: ({ children }) => <EuiTableHeaderCell>{children}</EuiTableHeaderCell>,
  td: ({ children }) => <EuiTableRowCell>{children}</EuiTableRowCell>,
  h1: ({ children, node }) => {
    const id = getReadmeAnchorId(children[0]?.toString(), node.position?.start.line);
    return (
      <h3
        ref={(element) => {
          refs.current.set(id, element);
        }}
        css={css`
          scroll-margin-top: 72px;
        `}
      >
        {children}
      </h3>
    );
  },
  h2: ({ children, node }) => {
    const id = getReadmeAnchorId(children[0]?.toString(), node.position?.start.line);
    return (
      <h4
        ref={(element) => {
          refs.current.set(id, element);
        }}
        css={css`
          scroll-margin-top: 72px;
        `}
      >
        {children}
      </h4>
    );
  },
  h3: ({ children, node }) => {
    const id = getReadmeAnchorId(children[0]?.toString(), node.position?.start.line);
    return (
      <h5
        ref={(element) => {
          refs.current.set(id, element);
        }}
        css={css`
          scroll-margin-top: 72px;
        `}
      >
        {children}
      </h5>
    );
  },
  h4: ({ children, node }) => {
    const id = getReadmeAnchorId(children[0]?.toString(), node.position?.start.line);
    return (
      <h6
        ref={(element) => {
          refs.current.set(id, element);
        }}
        css={css`
          scroll-margin-top: 72px;
        `}
      >
        {children}
      </h6>
    );
  },
  a: ({ children, href, ...props }) => (
    <EuiLink
      href={href}
      target="_blank"
      rel={`${REL_NOOPENER} ${REL_NOFOLLOW} ${REL_NOREFERRER}`}
      {...props}
    >
      {children}
    </EuiLink>
  ),
  code: ({ inline, children }) =>
    inline ? <EuiCode>{children}</EuiCode> : <EuiCodeBlock>{children}</EuiCodeBlock>,
});

export interface AwsCatalogIntegrationReadmeProps {
  readonly http: HttpSetup;
  readonly packageName: string;
  readonly version: string;
  readonly markdown: string | undefined;
  readonly isLoading: boolean;
  readonly sectionRefs: MutableRefObject<Map<string, HTMLDivElement | null>>;
}

export const AwsCatalogIntegrationReadme: React.FC<AwsCatalogIntegrationReadmeProps> = ({
  http,
  packageName,
  version,
  markdown,
  isLoading,
  sectionRefs,
}) => {
  const { euiTheme } = useEuiTheme();

  const handleImageUri = useCallback(
    (uri: string) => {
      const isAbsolute = uri.startsWith('http://') || uri.startsWith('https://');
      if (isAbsolute) {
        return uri;
      }
      const imagePath = new URL(uri, 'http://example.com').pathname;
      return http.basePath.prepend(`${getEpmPackageInfoApiPath(packageName, version)}${imagePath}`);
    },
    [http, packageName, version]
  );

  const readmeCss = useMemo(
    () => css`
      & table {
        width: 100%;
      }
      & p,
      & li {
        line-height: 1.6;
      }
      & img {
        max-width: 100%;
        border-radius: ${euiTheme.border.radius.medium};
      }
    `,
    [euiTheme.border.radius.medium]
  );

  if (isLoading || markdown === undefined) {
    return (
      <EuiText>
        <EuiSkeletonText lines={5} />
        <EuiSpacer size="m" />
        <EuiSkeletonText lines={6} />
        <EuiSpacer size="m" />
        <EuiSkeletonText lines={4} />
      </EuiText>
    );
  }

  return (
    <EuiText grow className="eui-textBreakWord" css={readmeCss}>
      <ReactMarkdown
        transformImageUri={handleImageUri}
        components={markdownRenderers(sectionRefs)}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        remarkPlugins={[remarkGfm]}
      >
        {markdown}
      </ReactMarkdown>
    </EuiText>
  );
};

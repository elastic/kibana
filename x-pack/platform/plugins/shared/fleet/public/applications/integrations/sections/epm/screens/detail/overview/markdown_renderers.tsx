/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCode,
  EuiCodeBlock,
  EuiLink,
  EuiTableHeaderCell,
  EuiTable,
  EuiTableRow,
  EuiTableRowCell,
} from '@elastic/eui';
import React from 'react';
import type { MutableRefObject } from 'react';
import type { TransformOptions } from 'react-markdown';
import styled from 'styled-components';

import { getAnchorId } from './overview';

/** prevents links to the new pages from accessing `window.opener` */
const REL_NOOPENER = 'noopener';

/** prevents search engine manipulation by noting the linked document is not trusted or endorsed by us */
const REL_NOFOLLOW = 'nofollow';

/** prevents the browser from sending the current address as referrer via the Referer HTTP header */
const REL_NOREFERRER = 'noreferrer';

// Maps deprecated code block languages to supported ones in prism.js
const CODE_LANGUAGE_OVERRIDES: Record<string, string> = {
  $json: 'json',
  $yml: 'yml',
};

const StyledH3 = styled.h3`
  scroll-margin-top: 105px;
`;
const StyledH4 = styled.h4`
  scroll-margin-top: 105px;
`;
const StyledH5 = styled.h5`
  scroll-margin-top: 105px;
`;
const StyledH6 = styled.h5`
  scroll-margin-top: 105px;
`;

/*
  Refs passed from the parent component are needed to handle scrolling on selected header in the overviewPage
*/
export const markdownRenderers = (
  refs: MutableRefObject<Map<string, HTMLDivElement | null>>
): TransformOptions['components'] => {
  return {
    table: ({ children }) => <EuiTable>{children}</EuiTable>,
    tr: ({ children }) => <EuiTableRow>{children}</EuiTableRow>,
    th: ({ children }) => <EuiTableHeaderCell>{children}</EuiTableHeaderCell>,
    td: ({ children }) => <EuiTableRowCell>{children}</EuiTableRowCell>,
    // the headings used in markdown don't match our page so mapping them to the appropriate one
    h1: ({ children, node }) => {
      const id = getAnchorId(children[0]?.toString(), node.position?.start.line);
      return <StyledH3 ref={(element) => refs.current.set(`${id}`, element)}>{children}</StyledH3>;
    },
    h2: ({ children, node }) => {
      const id = getAnchorId(children[0]?.toString(), node.position?.start.line);
      return <StyledH4 ref={(element) => refs.current.set(`${id}`, element)}>{children}</StyledH4>;
    },
    h3: ({ children, node }) => {
      const id = getAnchorId(children[0]?.toString(), node.position?.start.line);
      return <StyledH5 ref={(element) => refs.current.set(`${id}`, element)}>{children}</StyledH5>;
    },
    h4: ({ children, node }) => {
      const id = getAnchorId(children[0]?.toString(), node.position?.start.line);
      return <StyledH6 ref={(element) => refs.current.set(`${id}`, element)}>{children}</StyledH6>;
    },
    h5: ({ children }) => <h6>{children}</h6>,
    h6: ({ children }) => <h6>{children}</h6>,
    a: ({ children, href }: { children: React.ReactNode[]; href?: string }) => (
      <EuiLink
        href={href}
        target="_blank"
        rel={`${REL_NOOPENER} ${REL_NOFOLLOW} ${REL_NOREFERRER}`}
      >
        {children}
      </EuiLink>
    ),
    code: ({ className, children, inline }) => {
      let parsedLang = /language-(\w+)/.exec(className || '')?.[1] ?? '';

      // Some integrations export code block content that includes language tags that have since
      // been removed or deprecated in `prism.js`, the upstream depedency that handles syntax highlighting
      // in EuiCodeBlock components
      const languageOverride = parsedLang ? CODE_LANGUAGE_OVERRIDES[parsedLang] : undefined;

      if (languageOverride) {
        parsedLang = languageOverride;
      }

      if (inline) {
        return <EuiCode>{children}</EuiCode>;
      }
      return (
        <EuiCodeBlock language={parsedLang} overflowHeight={500} isCopyable>
          {children}
        </EuiCodeBlock>
      );
    },
    img: (
      props: React.ClassAttributes<HTMLImageElement> & React.ImgHTMLAttributes<HTMLImageElement>
    ) => {
      return <img style={{ maxWidth: '100%' }} {...props} alt={props.alt} />;
    },
  };
};

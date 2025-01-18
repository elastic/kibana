/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText, EuiSkeletonText, EuiSpacer } from '@elastic/eui';
import React from 'react';
import type { MutableRefObject } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useLinks } from '../../../../../hooks';

import { markdownRenderers } from './markdown_renderers';

export function Readme({
  packageName,
  version,
  markdown,
  refs,
}: {
  packageName: string;
  version: string;
  markdown: string | undefined;
  refs: MutableRefObject<Map<string, HTMLDivElement | null>>;
}) {
  const { toRelativeImage } = useLinks();
  const handleImageUri = React.useCallback(
    (uri: string) => {
      const isRelative =
        uri.indexOf('http://') === 0 || uri.indexOf('https://') === 0 ? false : true;

      const fullUri = isRelative ? toRelativeImage({ packageName, version, path: uri }) : uri;
      return fullUri;
    },
    [toRelativeImage, packageName, version]
  );

  return (
    <>
      {markdown !== undefined ? (
        <EuiText grow={true}>
          <ReactMarkdown
            transformImageUri={handleImageUri}
            components={markdownRenderers(refs)}
            remarkPlugins={[remarkGfm]}
          >
            {markdown}
          </ReactMarkdown>
        </EuiText>
      ) : (
        <EuiText>
          {/* simulates a long page of text loading */}
          <EuiSkeletonText lines={5} />
          <EuiSpacer size="m" />
          <EuiSkeletonText lines={6} />
          <EuiSpacer size="m" />
          <EuiSkeletonText lines={4} />
        </EuiText>
      )}
    </>
  );
}

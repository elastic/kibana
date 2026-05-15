/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import unified from 'unified';
import { cloneDeep } from 'lodash/fp';
import type { EuiMarkdownFormatProps, EuiLinkAnchorProps } from '@elastic/eui';
import { EuiMarkdownFormat, EuiText } from '@elastic/eui';
import { MarkdownLink } from './markdown_link';
import { usePlugins } from './use_plugins';

interface Props {
  children: string;
  disableLinks?: boolean;
  textSize?: EuiMarkdownFormatProps['textSize'];
}

const withDisabledLinks = (disableLinks?: boolean): React.FC<EuiLinkAnchorProps> => {
  const MarkdownLinkProcessingComponent: React.FC<EuiLinkAnchorProps> = memo((props) => (
    <MarkdownLink {...props} disableLinks={disableLinks} />
  ));

  MarkdownLinkProcessingComponent.displayName = 'MarkdownLinkProcessingComponent';

  return MarkdownLinkProcessingComponent;
};

const MarkdownRendererComponent: React.FC<Props> = ({ children, disableLinks, textSize }) => {
  // eslint-disable-next-line no-console
  console.log(
    '[Cases:MarkdownRenderer] rendering, content length:',
    children?.length,
    'content preview:',
    children?.slice(0, 80)
  );
  const { processingPlugins, parsingPlugins } = usePlugins();
  // Deep clone of the processing plugins to prevent affecting the markdown editor.
  const processingPluginList = cloneDeep(processingPlugins);
  // This line of code is TS-compatible and it will break if [1][1] change in the future.
  processingPluginList[1][1].components.a = useMemo(
    () => withDisabledLinks(disableLinks),
    [disableLinks]
  );

  // Pre-validate markdown parsing in our own try/catch. The try/catch inside
  // EuiMarkdownFormat (in the DLL bundle) can be corrupted by the SWC minifier
  // (compress.passes:2 bug), so errors escape and crash the page. By running
  // processSync here (in cases.plugin.js, which uses webpack's minifier), we
  // get a reliable try/catch that falls back to plain text on failure.
  const parseError = useMemo(() => {
    try {
      unified().use(parsingPlugins).use(processingPluginList).processSync(children);
      return null;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[Cases:MarkdownRenderer] pre-validation caught error, falling back:', e);
      return true;
    }
  }, [children, parsingPlugins, processingPluginList]);

  if (parseError) {
    return (
      <EuiText size={textSize} data-test-subj="markdown-renderer-fallback">
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{children}</pre>
      </EuiText>
    );
  }

  return (
    <EuiMarkdownFormat
      parsingPluginList={parsingPlugins}
      processingPluginList={processingPluginList}
      grow={true}
      textSize={textSize}
    >
      {children}
    </EuiMarkdownFormat>
  );
};
MarkdownRendererComponent.displayName = 'MarkdownRenderer';

export const MarkdownRenderer = memo(MarkdownRendererComponent);

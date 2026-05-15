/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { cloneDeep } from 'lodash/fp';
import type { EuiMarkdownFormatProps, EuiLinkAnchorProps } from '@elastic/eui';
import { EuiMarkdownFormat } from '@elastic/eui';
import { MarkdownLink } from './markdown_link';
import { usePlugins } from './use_plugins';

// eslint-disable-next-line no-console
console.log('[Cases:renderer.tsx] Module loaded — chunk evaluated successfully.');

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
  console.error(
    '[Cases:MarkdownRenderer] COMPONENT ENTERED.',
    'children length:',
    (children as string)?.length,
    'children type:',
    typeof children,
    'children preview:',
    (children as string)?.slice(0, 200),
    'disableLinks:',
    disableLinks,
    'has bare ampersand:',
    /&(?!(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-fA-F]+);)/.test(children as string)
  );

  const { processingPlugins, parsingPlugins } = usePlugins();

  const linkComponent = useMemo(() => withDisabledLinks(disableLinks), [disableLinks]);
  // Deep clone of the processing plugins to prevent affecting the markdown editor.
  const processingPluginList = cloneDeep(processingPlugins);
  const rehypeConfig = processingPluginList?.[1]?.[1];
  if (rehypeConfig?.components) {
    rehypeConfig.components.a = linkComponent;
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      '[Cases:MarkdownRenderer] WARNING: could not set linkComponent.',
      'rehypeConfig:',
      rehypeConfig
    );
  }

  // eslint-disable-next-line no-console
  console.error(
    '[Cases:MarkdownRenderer] ABOUT TO RENDER EuiMarkdownFormat.',
    'children length:',
    (children as string)?.length,
    'has bare ampersand:',
    /&(?!(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-fA-F]+);)/.test(children as string)
  );

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

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
  console.log(
    '[Cases:MarkdownRenderer] component ENTERED.',
    'children length:',
    (children as string)?.length,
    'children type:',
    typeof children,
    'children preview:',
    (children as string)?.slice(0, 100),
    'disableLinks:',
    disableLinks,
    'textSize:',
    textSize,
    'has ampersand:',
    (children as string)?.includes('&'),
    'has &amp;:',
    (children as string)?.includes('&amp;')
  );

  const { processingPlugins, parsingPlugins } = usePlugins();

  // eslint-disable-next-line no-console
  console.log(
    '[Cases:MarkdownRenderer] usePlugins returned.',
    'processingPlugins type:',
    typeof processingPlugins,
    'processingPlugins isArray:',
    Array.isArray(processingPlugins),
    'processingPlugins length:',
    processingPlugins?.length,
    'processingPlugins[1] type:',
    typeof processingPlugins?.[1],
    'processingPlugins[1] isArray:',
    Array.isArray(processingPlugins?.[1]),
    'processingPlugins[1] length:',
    (processingPlugins?.[1] as unknown[])?.length,
    'processingPlugins[1][1] type:',
    typeof processingPlugins?.[1]?.[1],
    'processingPlugins[1][1]:',
    processingPlugins?.[1]?.[1] != null ? 'exists' : 'NULL/UNDEFINED',
    'processingPlugins[1][1].components:',
    (processingPlugins?.[1]?.[1] as Record<string, unknown>)?.components != null
      ? 'exists'
      : 'NULL/UNDEFINED'
  );

  const linkComponent = useMemo(() => withDisabledLinks(disableLinks), [disableLinks]);
  // Deep clone of the processing plugins to prevent affecting the markdown editor.
  const processingPluginList = cloneDeep(processingPlugins);

  // eslint-disable-next-line no-console
  console.log(
    '[Cases:MarkdownRenderer] after cloneDeep.',
    'processingPluginList type:',
    typeof processingPluginList,
    'processingPluginList isArray:',
    Array.isArray(processingPluginList),
    'processingPluginList length:',
    processingPluginList?.length,
    'processingPluginList[1] type:',
    typeof processingPluginList?.[1],
    'processingPluginList[1] isArray:',
    Array.isArray(processingPluginList?.[1]),
    'processingPluginList[1][1] type:',
    typeof processingPluginList?.[1]?.[1],
    'processingPluginList[1][1]:',
    processingPluginList?.[1]?.[1] != null ? 'exists' : 'NULL/UNDEFINED',
    'processingPluginList[1][1]?.components:',
    (processingPluginList?.[1]?.[1] as Record<string, unknown>)?.components != null
      ? 'exists'
      : 'NULL/UNDEFINED'
  );

  const rehypeConfig = processingPluginList?.[1]?.[1];
  if (rehypeConfig?.components) {
    rehypeConfig.components.a = linkComponent;
    // eslint-disable-next-line no-console
    console.log(
      '[Cases:MarkdownRenderer] successfully set linkComponent on rehypeConfig.components.a'
    );
  } else {
    // eslint-disable-next-line no-console
    console.warn(
      '[Cases:MarkdownRenderer] WARNING: could not set linkComponent.',
      'rehypeConfig:',
      rehypeConfig,
      'rehypeConfig?.components:',
      rehypeConfig?.components
    );
  }

  // eslint-disable-next-line no-console
  console.log(
    '[Cases:MarkdownRenderer] about to render EuiMarkdownFormat.',
    'children length:',
    (children as string)?.length
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

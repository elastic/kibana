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
  const { processingPlugins, parsingPlugins } = usePlugins();
  // Deep clone of the processing plugins to prevent affecting the markdown editor.
  const processingPluginList = cloneDeep(processingPlugins);
  // This line of code is TS-compatible and it will break if [1][1] change in the future.
  processingPluginList[1][1].components.a = useMemo(
    () => withDisabledLinks(disableLinks),
    [disableLinks]
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

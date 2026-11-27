/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiMarkdownFormat,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
} from '@elastic/eui';
import type { EuiMarkdownFormatProps } from '@elastic/eui';
import { markdownTimeComponents, markdownTimeParser } from './markdown_time_plugin';

const buildPluginLists = () => {
  const processingPlugins = getDefaultEuiMarkdownProcessingPlugins();
  const [, rehypeToReactOptions] = processingPlugins[1];
  rehypeToReactOptions.components = {
    ...rehypeToReactOptions.components,
    ...markdownTimeComponents,
  };

  return {
    parsingPluginList: [...getDefaultEuiMarkdownParsingPlugins(), markdownTimeParser],
    processingPluginList: processingPlugins,
  };
};

// The lists do not depend on props, so they are built once and keep a stable identity.
const { parsingPluginList, processingPluginList } = buildPluginLists();

/** `EuiMarkdownFormat` that also renders `<time datetime="...">` tags in the viewer's timezone. */
export const TimeAwareMarkdown = (props: EuiMarkdownFormatProps): React.ReactElement => (
  <EuiMarkdownFormat
    {...props}
    parsingPluginList={parsingPluginList}
    processingPluginList={processingPluginList}
  />
);

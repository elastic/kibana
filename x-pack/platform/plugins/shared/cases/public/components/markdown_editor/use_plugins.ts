/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
  getDefaultEuiMarkdownUiPlugins,
} from '@elastic/eui';
import { useMemo } from 'react';
import { useTimelineContext } from '../timeline_context/use_timeline_context';
import { KibanaServices, useApplicationCapabilities } from '../../common/lib/kibana';
import * as lensMarkdownPlugin from './plugins/lens';
import { ID as LensPluginId } from './plugins/lens/constants';

export const usePlugins = (
  disabledPlugins?: string[]
): {
  uiPlugins: ReturnType<typeof getDefaultEuiMarkdownUiPlugins>;
  parsingPlugins: ReturnType<typeof getDefaultEuiMarkdownParsingPlugins>;
  processingPlugins: ReturnType<typeof getDefaultEuiMarkdownProcessingPlugins>;
} => {
  const kibanaConfig = KibanaServices.getConfig();
  const timelinePlugins = useTimelineContext()?.editor_plugins;
  const appCapabilities = useApplicationCapabilities();

  return useMemo(() => {
    const uiPlugins = getDefaultEuiMarkdownUiPlugins();
    const parsingPlugins = getDefaultEuiMarkdownParsingPlugins();
    const processingPlugins = getDefaultEuiMarkdownProcessingPlugins();

    // eslint-disable-next-line no-console
    console.log(
      '[Cases:usePlugins] getDefaultEuiMarkdownProcessingPlugins returned.',
      'type:',
      typeof processingPlugins,
      'isArray:',
      Array.isArray(processingPlugins),
      'length:',
      processingPlugins?.length,
      '[0] type:',
      typeof processingPlugins?.[0],
      '[1] type:',
      typeof processingPlugins?.[1],
      '[1] isArray:',
      Array.isArray(processingPlugins?.[1]),
      '[1] length:',
      (processingPlugins?.[1] as unknown[])?.length,
      '[1][0] type:',
      typeof processingPlugins?.[1]?.[0],
      '[1][1] type:',
      typeof processingPlugins?.[1]?.[1],
      '[1][1]:',
      processingPlugins?.[1]?.[1] != null ? 'exists' : 'NULL/UNDEFINED',
      '[1][1].components:',
      (processingPlugins?.[1]?.[1] as Record<string, unknown>)?.components != null
        ? 'exists'
        : 'NULL/UNDEFINED'
    );

    if (timelinePlugins) {
      uiPlugins.push(timelinePlugins.uiPlugin);

      parsingPlugins.push(timelinePlugins.parsingPlugin);

      // This line of code is TS-compatible and it will break if [1][1] change in the future.
      processingPlugins[1][1].components.timeline = timelinePlugins.processingPluginRenderer;
    }

    if (
      kibanaConfig?.markdownPlugins?.lens &&
      !disabledPlugins?.includes(LensPluginId) &&
      appCapabilities?.visualize.crud
    ) {
      uiPlugins.push(lensMarkdownPlugin.plugin);
    }

    parsingPlugins.push(lensMarkdownPlugin.parser);
    // This line of code is TS-compatible and it will break if [1][1] change in the future.
    processingPlugins[1][1].components.lens = lensMarkdownPlugin.renderer;

    // eslint-disable-next-line no-console
    console.log(
      '[Cases:usePlugins] final processingPlugins[1][1].components keys:',
      Object.keys((processingPlugins?.[1]?.[1] as Record<string, unknown>)?.components ?? {})
    );

    return {
      uiPlugins,
      parsingPlugins,
      processingPlugins,
    };
  }, [
    appCapabilities?.visualize.crud,
    disabledPlugins,
    kibanaConfig?.markdownPlugins?.lens,
    timelinePlugins,
  ]);
};

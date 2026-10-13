/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LiveCollectionOptions, StyleHandle } from '@elastic/distillate';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { isomerDistillery, isomerRenderOptions } from './distillery';
import { collectRootStyles } from './root_styles';

/**
 * The render context for one React render of Isomer primitives. Resolving a class name collects
 * its CSS, and `sink` (for example `createDomSink`) receives the stylesheet as it grows.
 */
export const createIsomerStyleContext = (
  options?: LiveCollectionOptions
): Required<Pick<StyledRenderContext, 'resolveClassName'>> => {
  const { collector, resolveClassName } = isomerDistillery.liveCollection({
    ...options,
    render: { ...isomerRenderOptions(), ...options?.render },
  });
  collectRootStyles(collector);
  return {
    // Primitives pass Distillate handles, which the SDK types as its narrower `StyleHandle`.
    resolveClassName: (...handles) => resolveClassName(...(handles as unknown as StyleHandle[])),
  };
};

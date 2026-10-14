/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StyleHandle } from '@elastic/distillate';
import type { StyledRenderContext } from '@elastic/isomer-sdk';

/** Resolves Distillate handles through the host's style adapter, or to their readable names without one. */
export const classNames = (
  context: StyledRenderContext | undefined,
  ...handles: Array<StyleHandle | undefined>
): string => {
  const present = handles.filter((handle): handle is StyleHandle => handle !== undefined);
  return context?.resolveClassName
    ? context.resolveClassName(...present)
    : present.map(({ readableName }) => readableName).join(' ');
};

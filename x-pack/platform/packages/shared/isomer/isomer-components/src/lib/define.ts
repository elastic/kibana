/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultPackTypes, StyledRenderContext } from '@elastic/isomer-sdk';
import { definePrimitiveFor } from '@elastic/isomer-sdk';

/** The pack's render context: the styling hooks, plus what a host resolves for it. */
export interface ComponentsRenderContext extends StyledRenderContext {
  /**
   * Resolves a path under the space's base URL, such as `/app/discover#/`, to a URL, such as through
   * `http.basePath.prepend`; `undefined` when it can't.
   */
  resolveKibanaPath?: (path: string) => string | undefined;
}

export interface ComponentsPackTypes extends DefaultPackTypes {
  context: ComponentsRenderContext;
}

/** `definePrimitive` bound to this pack's render context. */
export const definePrimitive = definePrimitiveFor<ComponentsPackTypes>();

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultPackTypes, StyledRenderContext } from '@elastic/isomer-sdk';
import { definePrimitiveFor } from '@elastic/isomer-sdk';

/** A place in a Kibana app: its app id, and a path inside it. */
export interface AppLinkTarget {
  app: string;
  path?: string;
}

/** The pack's render context: the styling hooks, plus what a host resolves for it. */
export interface ComponentsRenderContext extends StyledRenderContext {
  /** Resolves a Kibana app path to a URL, such as through `application.getUrlForApp`; `undefined` when it can't. */
  resolveAppLink?: (target: AppLinkTarget) => string | undefined;
  /** Resolves a Files plugin file id to a URL to show it from, such as its blob route; `undefined` when it can't. */
  resolveFileUrl?: (fileId: string) => string | undefined;
}

export interface ComponentsPackTypes extends DefaultPackTypes {
  context: ComponentsRenderContext;
}

/** `definePrimitive` bound to this pack's render context. */
export const definePrimitive = definePrimitiveFor<ComponentsPackTypes>();

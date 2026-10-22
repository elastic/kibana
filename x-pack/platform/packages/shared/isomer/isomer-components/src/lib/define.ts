/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultPackTypes, StyledRenderContext } from '@elastic/isomer-sdk';
import { definePrimitiveFor } from '@elastic/isomer-sdk';

export interface ComponentsPackTypes extends DefaultPackTypes {
  context: StyledRenderContext;
}

/** `definePrimitive` bound to this pack's render context. */
export const definePrimitive = definePrimitiveFor<ComponentsPackTypes>();

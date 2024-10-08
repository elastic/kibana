/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PreDragActions } from '@hello-pangea/dnd';

declare module '@hello-pangea/dnd' {
  export * from '@hello-pangea/dnd';

  // TODO: This type can be imported directly from @hello-pangea/dnd once on v16.3.0 (which requires Webpack v5)
  // and this entire file/folder can be deleted at that point
  export type FluidDragActions = ReturnType<PreDragActions['fluidLift']>;
}

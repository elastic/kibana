/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineAction, nodeIdSchema, type ActionOf } from '@kbn/custom-app-registry';

export const openFlyoutAction = defineAction({
  kind: 'action',
  id: 'openFlyout',
  version: 1,
  props: lazySchema(() => z.object({ flyout: nodeIdSchema.describe('The id of the flyout.') })),
  doc: {
    summary: 'Opens a flyout of the app.',
    whenToUse: 'To show details of what was clicked, next to the other actions of the event.',
    example: { type: 'openFlyout', flyout: 'details' },
  },
  validate: (action, { nodeId, overlayIds, issue }) => {
    if (!overlayIds.has(action.flyout)) {
      issue(`Node "${nodeId}" opens "${action.flyout}", which is not a flyout`);
    }
  },
});

declare module '@kbn/custom-app-registry' {
  interface ActionTypeMap {
    openFlyout: ActionOf<typeof openFlyoutAction>;
  }
}

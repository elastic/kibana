/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { defineAction, type ActionOf } from '@kbn/custom-app-registry';

export const closeFlyoutAction = defineAction({
  kind: 'action',
  id: 'closeFlyout',
  version: 1,
  props: lazySchema(() => z.object({})),
  doc: {
    summary: 'Closes the flyout that is open.',
    whenToUse: 'On a button inside a flyout, to dismiss it.',
    example: { type: 'closeFlyout' },
  },
});

declare module '@kbn/custom-app-registry' {
  interface ActionTypeMap {
    closeFlyout: ActionOf<typeof closeFlyoutAction>;
  }
}

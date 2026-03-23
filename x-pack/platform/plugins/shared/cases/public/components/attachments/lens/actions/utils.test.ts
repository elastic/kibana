/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLensCaseAttachment } from './utils';

describe('utils', () => {
  describe('getLensCaseAttachment', () => {
    it('create a case lens attachment correctly', () => {
      const embeddable = { attributes: {}, timeRange: {} };

      // @ts-expect-error: extra attributes are not needed
      expect(getLensCaseAttachment(embeddable)).toMatchInlineSnapshot(`
        Object {
          "persistableStateAttachmentState": Object {
            "attributes": Object {},
            "metadata": undefined,
            "timeRange": Object {},
          },
          "persistableStateAttachmentTypeId": ".lens",
          "type": "persistableState",
        }
      `);
    });
  });
});

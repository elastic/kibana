/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PersistableStateAttachmentTypeRegistry } from './persistable_state_registry';

export const ExpressionComponent: React.FunctionComponent = () => {
  return null;
};

const getItem = (id: string = 'test') => {
  return { id };
};

const attachmentState = {
  persistableStateAttachmentTypeId: 'test',
  persistableStateAttachmentState: { foo: 'foo' },
};

describe('PersistableStateAttachmentTypeRegistry', () => {
  describe('register()', () => {
    it('defaults properties if missing', () => {
      const registry = new PersistableStateAttachmentTypeRegistry();
      registry.register(getItem());

      expect(registry.has('test')).toEqual(true);

      const item = registry.get('test');

      expect(item).toMatchInlineSnapshot(`
        Object {
          "extract": [Function],
          "id": "test",
          "inject": [Function],
          "telemetry": [Function],
        }
      `);

      expect(item.telemetry(attachmentState, { foo: 'bar' })).toEqual({ foo: 'bar' });
      expect(item.inject(attachmentState, [])).toEqual(attachmentState);
      expect(item.extract(attachmentState)).toEqual({ state: attachmentState, references: [] });
    });

    it('throws error if item is already registered', () => {
      const registry = new PersistableStateAttachmentTypeRegistry();
      registry.register(getItem('test'));

      expect(() => registry.register(getItem('test'))).toThrowErrorMatchingInlineSnapshot(
        `"Item \\"test\\" is already registered on registry PersistableStateAttachmentTypeRegistry"`
      );
    });
  });
});

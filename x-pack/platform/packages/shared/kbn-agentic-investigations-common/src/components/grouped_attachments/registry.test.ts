/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFlyoutGroupedAttachmentsRegistry } from './registry';
import { FlyoutGroupedAttachments } from './types';

describe('createFlyoutGroupedAttachmentsRegistry', () => {
  it('returns the registered definition', () => {
    const registry = createFlyoutGroupedAttachmentsRegistry();
    const renderer = () => null;

    registry.register(FlyoutGroupedAttachments.ALERTS, ['security.alert'], renderer);

    expect(registry.get(FlyoutGroupedAttachments.ALERTS)).toEqual({
      attachmentTypes: ['security.alert'],
      renderer,
    });
    expect(registry.get(FlyoutGroupedAttachments.RULES)).toBeUndefined();
  });

  it('throws when a group is registered twice', () => {
    const registry = createFlyoutGroupedAttachmentsRegistry();
    registry.register(FlyoutGroupedAttachments.RULES, ['security.rule'], () => null);

    expect(() =>
      registry.register(FlyoutGroupedAttachments.RULES, ['security.rule'], () => null)
    ).toThrow('already registered');
  });

  it('keeps registries independent', () => {
    const first = createFlyoutGroupedAttachmentsRegistry();
    const second = createFlyoutGroupedAttachmentsRegistry();

    first.register(FlyoutGroupedAttachments.ALERTS, ['security.alert'], () => null);

    expect(second.get(FlyoutGroupedAttachments.ALERTS)).toBeUndefined();
  });
});

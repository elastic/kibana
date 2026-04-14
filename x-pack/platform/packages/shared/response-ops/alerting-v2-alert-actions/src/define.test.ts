/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { defineAlertActionType } from './define';

describe('defineAlertActionType', () => {
  it('derives fullSchema with action_type literal', () => {
    const def = defineAlertActionType({
      id: 'ack',
      description: 'Acknowledges an alert.',
      bodySchema: z.object({ episode_id: z.string() }),
    });

    const parsed = def.fullSchema.safeParse({ action_type: 'ack', episode_id: 'ep-1' });
    expect(parsed.success).toBe(true);

    const wrongType = def.fullSchema.safeParse({ action_type: 'tag', episode_id: 'ep-1' });
    expect(wrongType.success).toBe(false);
  });

  it('derives routeBodySchema that rejects action_type', () => {
    const def = defineAlertActionType({
      id: 'ack',
      description: 'Acknowledges.',
      bodySchema: z.object({ episode_id: z.string() }),
    });

    const valid = def.routeBodySchema.safeParse({ episode_id: 'ep-1' });
    expect(valid.success).toBe(true);

    const withActionType = def.routeBodySchema.safeParse({
      action_type: 'ack',
      episode_id: 'ep-1',
    });
    expect(withActionType.success).toBe(false);
  });

  it('defaults pathSuffix to _${id}', () => {
    const def = defineAlertActionType({
      id: 'snooze',
      description: 'Snoozes.',
      bodySchema: z.object({}),
    });

    expect(def.pathSuffix).toBe('_snooze');
  });

  it('uses custom pathSuffix when provided', () => {
    const def = defineAlertActionType({
      id: 'snooze',
      pathSuffix: '_custom',
      description: 'Snoozes.',
      bodySchema: z.object({}),
    });

    expect(def.pathSuffix).toBe('_custom');
  });

  it('defaults esMappings to empty object', () => {
    const def = defineAlertActionType({
      id: 'noop',
      description: 'Does nothing.',
      bodySchema: z.object({}),
    });

    expect(def.esMappings).toEqual({});
  });

  it('preserves esMappings when provided', () => {
    const mappings = { tags: { type: 'keyword' as const } };
    const def = defineAlertActionType({
      id: 'tag',
      description: 'Tags.',
      bodySchema: z.object({ tags: z.array(z.string()) }),
      esMappings: mappings,
    });

    expect(def.esMappings).toEqual(mappings);
  });
});

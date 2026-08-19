/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { z } from '@kbn/zod/v4';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import { ArtifactTypeRegistry } from './artifact_type_registry';
import { validateArtifactsAgainstRegistry } from './validate_artifacts';

describe('validateArtifactsAgainstRegistry', () => {
  let registry: ArtifactTypeRegistry;

  beforeEach(() => {
    registry = new ArtifactTypeRegistry();
    registry.register({
      type: 'runbook',
      dataSchema: z
        .object({
          content: z
            .string()
            .min(1)
            .max(100)
            .refine((value) => value.trim().length > 0),
        })
        .strict(),
    });
  });

  describe('unregistered types', () => {
    const validate = (data: Record<string, unknown>) =>
      validateArtifactsAgainstRegistry([{ id: 'a1', type: 'unknown', data }], registry);

    it('passes data of any shape through untouched', () => {
      expect(() =>
        validate({ anything: true, nested: { deep: [1, 2, 3] }, note: 'a'.repeat(1024) })
      ).not.toThrow();
    });

    it('never rejects on size, so a rollback of the owning plugin cannot fail writes', () => {
      // Legal under a since-unregistered schema (e.g. `content: z.string().max(50_000)`).
      expect(() => validate({ content: 'a'.repeat(50_000) })).not.toThrow();
    });

    it('does not measure structured values either', () => {
      expect(() => validate({ list: new Array(1024).fill(1) })).not.toThrow();
    });
  });

  it('still validates a registered type when unregistered artifacts ride along', () => {
    expect(() =>
      validateArtifactsAgainstRegistry(
        [
          { id: 'a1', type: 'unknown', data: { note: 'a'.repeat(50_000) } },
          { id: 'r1', type: 'runbook', data: { content: '' } },
        ],
        registry
      )
    ).toThrow('has invalid data');
  });

  it('rejects invalid data for registered types with INVALID_ARTIFACT_DATA', () => {
    try {
      validateArtifactsAgainstRegistry(
        [{ id: 'r1', type: 'runbook', data: { content: '' } }],
        registry
      );
      throw new Error('expected validation to throw');
    } catch (error) {
      expect(Boom.isBoom(error)).toBe(true);
      expect((error as Boom.Boom).data).toEqual(
        expect.objectContaining({ code: ALERTING_ERROR_CODES.INVALID_ARTIFACT_DATA })
      );
    }
  });

  it('accepts valid registered data', () => {
    expect(() =>
      validateArtifactsAgainstRegistry(
        [{ id: 'r1', type: 'runbook', data: { content: '# Steps' } }],
        registry
      )
    ).not.toThrow();
  });
});

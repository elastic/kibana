/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { modelVersion1 } from './model_version_1';
import { modelVersion2 } from './model_version_2';
import { modelVersion3 } from './model_version_3';

describe('cases-attachments model versions', () => {
  describe('version 1', () => {
    it('is the model-version baseline (no schema or mapping changes)', () => {
      expect(modelVersion1.changes).toEqual([]);
    });
  });

  describe('version 2', () => {
    it('indexes the observable fields inside data', () => {
      expect(modelVersion2.changes).toEqual([
        {
          type: 'mappings_addition',
          addedMappings: {
            data: {
              properties: {
                typeKey: { type: 'keyword', ignore_above: 1024 },
                value: { type: 'keyword', ignore_above: 1024 },
                description: { type: 'keyword', ignore_above: 1024 },
                legacyId: { type: 'keyword', ignore_above: 1024 },
              },
            },
          },
        },
      ]);
    });

    it('accepts observable data on create', () => {
      expect(() =>
        modelVersion2.schemas.create.validate({
          type: 'observable',
          owner: 'securitySolution',
          data: { typeKey: 'observable-type-ipv4', value: '10.0.0.1', description: null },
          created_at: '2026-11-04T00:00:00.000Z',
          created_by: { username: 'elastic' },
        })
      ).not.toThrow();
    });

    it('accepts the legacy id of a migrated observable', () => {
      expect(() =>
        modelVersion2.schemas.create.validate({
          type: 'observable',
          owner: 'securitySolution',
          data: {
            typeKey: 'observable-type-ipv4',
            value: '10.0.0.1',
            description: null,
            legacyId: 'a9f6c5f0-2b4e-4d0a-9c1b-3e5f7a9b1c2d',
          },
          created_at: '2026-11-04T00:00:00.000Z',
          created_by: { username: null },
        })
      ).not.toThrow();
    });
  });

  describe('version 3', () => {
    const observable = (metadata: unknown) => ({
      type: 'observable',
      owner: 'securitySolution',
      data: { typeKey: 'observable-type-ipv4', value: '10.0.0.1', description: null, metadata },
      created_at: '2026-11-05T00:00:00.000Z',
      created_by: { username: 'elastic' },
    });

    it('indexes the observable metadata as one flattened field', () => {
      expect(modelVersion3.changes).toEqual([
        {
          type: 'mappings_addition',
          addedMappings: {
            data: { properties: { metadata: { type: 'flattened', ignore_above: 1024 } } },
          },
        },
      ]);
    });

    it('accepts key/value metadata, null and no metadata', () => {
      const { create } = modelVersion3.schemas;
      expect(() =>
        create.validate(
          observable({ virustotal: 'https://www.virustotal.com/gui/ip-address/10.0.0.1' })
        )
      ).not.toThrow();
      expect(() => create.validate(observable(null))).not.toThrow();
      expect(() => create.validate(observable(undefined))).not.toThrow();
    });

    it('rejects more than 20 entries', () => {
      const metadata = Object.fromEntries(
        Array.from({ length: 21 }, (_, index) => [`key-${index}`, 'value'])
      );
      expect(() => modelVersion3.schemas.create.validate(observable(metadata))).toThrow(
        /at most 20 entries/
      );
    });

    it('rejects keys and values over their length bounds', () => {
      const { create } = modelVersion3.schemas;
      expect(() => create.validate(observable({ ['k'.repeat(257)]: 'value' }))).toThrow();
      expect(() => create.validate(observable({ key: 'v'.repeat(1025) }))).toThrow();
      expect(() => create.validate(observable({ key: 1 }))).toThrow();
    });
  });
});

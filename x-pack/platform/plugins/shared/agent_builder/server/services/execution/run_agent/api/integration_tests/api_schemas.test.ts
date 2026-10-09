/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toDescribedSchema } from '../describe_schema';
import { getRegistries } from '../registry';
import { getValidator } from '../validate_params';
import type { ApiTarget } from '../types';

const collectRefs = (node: unknown, found: string[]): string[] => {
  if (Array.isArray(node)) {
    node.forEach((item) => collectRefs(item, found));
    return found;
  }
  if (typeof node !== 'object' || node === null) {
    return found;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === '$ref' && typeof value === 'string') {
      found.push(value);
    } else {
      collectRefs(value, found);
    }
  }
  return found;
};

const collectKeys = (node: unknown, found: Set<string>): Set<string> => {
  if (Array.isArray(node)) {
    node.forEach((item) => collectKeys(item, found));
    return found;
  }
  if (typeof node !== 'object' || node === null) {
    return found;
  }
  for (const [key, value] of Object.entries(node)) {
    found.add(key);
    collectKeys(value, found);
  }
  return found;
};

describe('@elastic/schemas registries', () => {
  describe('getRegistries', () => {
    it('exposes both target registries with a populated manifest', async () => {
      const registries = await getRegistries();

      expect(registries.elasticsearch.manifest.length).toBeGreaterThan(100);
      expect(registries.kibana.manifest.length).toBeGreaterThan(100);
    });

    it('returns the same memoized registries across calls', async () => {
      const [first, second] = await Promise.all([getRegistries(), getRegistries()]);

      expect(first).toBe(second);
    });

    it('exposes manifest entries in the shape the discover tool renders', async () => {
      const { elasticsearch } = await getRegistries();
      const entry = elasticsearch.manifest.find((meta) => meta.id === 'cluster.health');

      expect(entry).toEqual(
        expect.objectContaining({
          id: 'cluster.health',
          name: 'health',
          namespace: 'cluster',
          description: expect.any(String),
        })
      );
    });
  });

  describe('getValidator', () => {
    it('builds a working validator for a real schema', async () => {
      const { elasticsearch } = await getRegistries();
      const { definition } = await elasticsearch.loadApi('cluster.health');

      const validate = await getValidator('elasticsearch', definition.input!);

      expect(validate({})).toEqual([]);
      expect(validate({ timeout: '30s' })).toEqual([]);
    });

    it('resolves the shared type files a schema $refs', async () => {
      // `indices.create` pulls in _types.json, _types.mapping.json and indices._types.json, so it
      // exercises the multi-pass ref walk that most Elasticsearch APIs depend on.
      const { elasticsearch } = await getRegistries();
      const { definition } = await elasticsearch.loadApi('indices.create');

      const validate = await getValidator('elasticsearch', definition.input!);

      expect(validate({ index: 'my-index' })).toEqual([]);
      expect(validate({ index: 'my-index', mappings: { properties: {} } })).toEqual([]);
    });

    it('reuses the cached validator for a repeated input schema', async () => {
      const { elasticsearch } = await getRegistries();
      const { definition } = await elasticsearch.loadApi('indices.create');

      const [first, second] = await Promise.all([
        getValidator('elasticsearch', definition.input!),
        getValidator('elasticsearch', definition.input!),
      ]);

      expect(first({ index: 'my-index' })).toEqual([]);
      expect(second({ index: 'my-index' })).toEqual([]);
    });

    it.each<ApiTarget>(['elasticsearch', 'kibana'])(
      'builds a validator for every %s API',
      async (target) => {
        const registries = await getRegistries();
        const registry = registries[target];

        for (const meta of registry.manifest) {
          const { definition } = await registry.loadApi(meta.id);
          if (!definition.input) {
            continue;
          }
          const validate = await getValidator(target, definition.input);
          expect(typeof validate).toBe('function');
        }
      }
    );
  });

  describe('toDescribedSchema', () => {
    it.each<ApiTarget>(['elasticsearch', 'kibana'])(
      'leaves no cross-file reference in the described schema for any %s API',
      async (target) => {
        const registries = await getRegistries();
        const registry = registries[target];

        for (const meta of registry.manifest) {
          const { definition } = await registry.loadApi(meta.id);
          if (!definition.input) {
            continue;
          }

          const resolved = await toDescribedSchema(target, definition.input);
          const unresolved = collectRefs(resolved, []).filter((ref) => !ref.startsWith('#/$defs/'));

          expect({ api: meta.id, unresolved }).toEqual({ api: meta.id, unresolved: [] });
        }
      }
    );

    it.each<ApiTarget>(['elasticsearch', 'kibana'])(
      'leaves no routing annotation in the described schema for any %s API',
      async (target) => {
        const registries = await getRegistries();
        const registry = registries[target];

        for (const meta of registry.manifest) {
          const { definition } = await registry.loadApi(meta.id);
          if (!definition.input) {
            continue;
          }

          const described = await toDescribedSchema(target, definition.input);

          expect({
            api: meta.id,
            routed: collectKeys(described, new Set()).has('x-found-in'),
          }).toEqual({ api: meta.id, routed: false });
        }
      }
    );

    it('keeps the description a parameter hangs off its own reference', async () => {
      // Every `$ref` parameter on this API documents itself, so dropping the keys that sit
      // alongside a reference would leave the model with an undocumented schema.
      const { elasticsearch } = await getRegistries();
      const { definition } = await elasticsearch.loadApi('cluster.health');

      const described = await toDescribedSchema('elasticsearch', definition.input!);
      const properties = described.properties as Record<string, Record<string, unknown>>;

      expect(properties.timeout).toEqual({
        $ref: '#/$defs/_types__Duration',
        description: expect.stringContaining('The period to wait for a response.'),
      });
      const undocumented = Object.entries(properties)
        .filter(([, spec]) => typeof spec.description !== 'string')
        .map(([name]) => name);
      expect(undocumented).toEqual([]);
    });

    it('inlines a shared scalar type the model would otherwise see as a bare pointer', async () => {
      const { elasticsearch } = await getRegistries();
      const { definition } = await elasticsearch.loadApi('cluster.health');

      const resolved = await toDescribedSchema('elasticsearch', definition.input!);
      const defs = resolved.$defs as Record<string, { description?: string }>;

      expect(Object.keys(defs)).toContain('_types__Duration');
      expect(defs._types__Duration.description).toEqual(expect.any(String));
    });

    it('keeps the recursive mapping types from exploding the described schema', async () => {
      // `indices.create` closes over ~450 definitions. Inlining them all produces ~400k
      // characters, so the budget has to stub the oversized ones out.
      const { elasticsearch } = await getRegistries();
      const { definition } = await elasticsearch.loadApi('indices.create');

      const resolved = await toDescribedSchema('elasticsearch', definition.input!);

      expect(JSON.stringify(resolved).length).toBeLessThan(40_000);
    });

    it('keeps definition names unique across shared files so a flat $defs block is safe', async () => {
      // `toDescribedSchema` keys its local `$defs` by the bare definition name. Upstream prefixes
      // every name with its file, so collisions cannot happen today; this fails loudly if that
      // ever changes.
      const owners = new Map<string, string>();
      const collisions: string[] = [];

      const { elasticsearch } = await getRegistries();

      for (const meta of elasticsearch.manifest) {
        const { definition } = await elasticsearch.loadApi(meta.id);
        if (!definition.input) {
          continue;
        }
        for (const ref of collectRefs(definition.input, [])) {
          const [file, pointer] = ref.split('#');
          const name = pointer?.replace('/$defs/', '');
          if (!file || !name) {
            continue;
          }
          if (owners.has(name) && owners.get(name) !== file) {
            collisions.push(`${name}: ${owners.get(name)} vs ${file}`);
          }
          owners.set(name, file);
        }
      }

      expect(collisions).toEqual([]);
      expect(owners.size).toBeGreaterThan(50);
    });
  });

  describe('NDJSON APIs', () => {
    it('still models no body parameter, which is why execute refuses them', async () => {
      // If this starts failing, upstream has added a way to supply the payload and the NDJSON
      // refusal in execute.ts can be revisited.
      const { elasticsearch } = await getRegistries();

      for (const id of ['bulk', 'msearch']) {
        const { definition } = await elasticsearch.loadApi(id);
        expect(definition.bodyFormat).toBe('ndjson');

        const properties = (definition.input?.properties ?? {}) as Record<
          string,
          { 'x-found-in'?: string }
        >;
        const locations = Object.values(properties).map((spec) => spec['x-found-in']);
        expect(locations).not.toContain('body');
      }
    });
  });
});

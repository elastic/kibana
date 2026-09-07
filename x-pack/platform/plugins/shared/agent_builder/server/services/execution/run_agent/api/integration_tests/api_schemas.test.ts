/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApiTarget } from '@kbn/agent-builder-common';
import { toDescribedDefinition, toDescribedSchema } from '../describe_schema';
import { getRegistries } from '../registry';
import { getValidator } from '../validate_params';

// Ceiling for a described API schema, and for the expansion of any type it stubs.
const MAX_DESCRIBED_CHARS = 40_000;

interface ApiInput {
  id: string;
  input: Record<string, unknown>;
}

const loadApiInputs = async (target: ApiTarget): Promise<ApiInput[]> => {
  const registries = await getRegistries();
  const registry = registries[target];
  const inputs: ApiInput[] = [];

  for (const meta of registry.manifest) {
    const { definition } = await registry.loadApi(meta.id);
    if (definition.input) {
      inputs.push({ id: meta.id, input: definition.input });
    }
  }

  return inputs;
};

const isLocalRef = (ref: string): boolean => ref === '#' || ref.startsWith('#/$defs/');

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

const crossFileRefs = (node: unknown): string[] =>
  collectRefs(node, []).filter((ref) => !isLocalRef(ref));

const containsKey = (node: unknown, key: string): boolean => {
  if (Array.isArray(node)) {
    return node.some((item) => containsKey(item, key));
  }
  if (typeof node !== 'object' || node === null) {
    return false;
  }
  return Object.entries(node).some(([name, value]) => name === key || containsKey(value, key));
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
        const problems: string[] = [];

        for (const { id, input } of await loadApiInputs(target)) {
          try {
            await getValidator(target, input);
          } catch (error) {
            problems.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        expect(problems).toEqual([]);
      }
    );
  });

  describe('toDescribedSchema', () => {
    it('leaves no cross-file reference in the described schema for any elasticsearch API', async () => {
      const problems: string[] = [];

      for (const { id, input } of await loadApiInputs('elasticsearch')) {
        const { schema } = await toDescribedSchema('elasticsearch', input);
        const unresolved = crossFileRefs(schema);
        if (unresolved.length > 0) {
          problems.push(`${id}: ${unresolved.join(', ')}`);
        }
      }

      expect(problems).toEqual([]);
    });

    it('keeps the description a parameter hangs off its own reference', async () => {
      // Every `$ref` parameter on this API documents itself, so dropping the keys that sit
      // alongside a reference would leave the model with an undocumented schema.
      const { elasticsearch } = await getRegistries();
      const { definition } = await elasticsearch.loadApi('cluster.health');

      const { schema } = await toDescribedSchema('elasticsearch', definition.input!);
      const properties = schema.properties as Record<string, Record<string, unknown>>;

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

      const { schema } = await toDescribedSchema('elasticsearch', definition.input!);
      const defs = schema.$defs as Record<string, { description?: string }>;

      expect(Object.keys(defs)).toContain('_types__Duration');
      expect(defs._types__Duration.description).toEqual(expect.any(String));
    });

    it.each<ApiTarget>(['elasticsearch', 'kibana'])(
      'keeps the described schema of every %s API within the size ceiling',
      async (target) => {
        // `indices.create` alone closes over ~450 definitions. Inlining them all produces ~400k
        // characters, so the budget has to stub the oversized ones out.
        const problems: string[] = [];

        for (const { id, input } of await loadApiInputs(target)) {
          const { schema } = await toDescribedSchema(target, input);
          const chars = JSON.stringify(schema).length;
          if (chars > MAX_DESCRIBED_CHARS) {
            problems.push(`${id}: ${chars}`);
          }
        }

        expect(problems).toEqual([]);
      }
    );

    it('conveys the query and aggregation types the search API accepts', async () => {
      const { elasticsearch } = await getRegistries();
      const { definition } = await elasticsearch.loadApi('search');

      const { schema, expandableTypes } = await toDescribedSchema(
        'elasticsearch',
        definition.input!
      );
      const properties = schema.properties as Record<string, Record<string, unknown>>;
      const aggregations = properties.aggregations.additionalProperties as Record<string, unknown>;

      expect(properties.query['x-expandable']).toBe('_types.query_dsl__QueryContainer');
      expect(properties.query['x-properties']).toEqual(
        expect.arrayContaining(['bool', 'range', 'term'])
      );

      expect(aggregations['x-expandable']).toBe('_types.aggregations__AggregationContainer');
      expect(aggregations['x-properties']).toEqual(
        expect.arrayContaining(['date_histogram', 'terms', 'avg'])
      );

      expect(expandableTypes).toEqual(
        expect.arrayContaining([
          '_types.aggregations__AggregationContainer',
          '_types.query_dsl__QueryContainer',
        ])
      );
    });

    it('keeps definition names unique across shared files so a flat $defs block is safe', async () => {
      // `toDescribedSchema` keys its local `$defs` by the bare definition name. Upstream prefixes
      // every name with its file, so collisions cannot happen today; this fails loudly if that
      // ever changes.
      const owners = new Map<string, string>();
      const collisions: string[] = [];

      for (const { input } of await loadApiInputs('elasticsearch')) {
        for (const ref of crossFileRefs(input)) {
          const [file, pointer] = ref.split('#');
          const name = pointer?.replace('/$defs/', '');
          if (!file || !name) {
            continue;
          }

          const owner = owners.get(name);
          if (!owner) {
            owners.set(name, file);
          } else if (owner !== file) {
            collisions.push(`${name}: ${owner} vs ${file}`);
          }
        }
      }

      expect(collisions).toEqual([]);
      expect(owners.size).toBeGreaterThan(50);
    });
  });

  describe('toDescribedDefinition', () => {
    it('describes every type stubbed by an elasticsearch API without leaking a cross-file reference', async () => {
      const stubbedBy = new Map<string, ApiInput>();

      for (const api of await loadApiInputs('elasticsearch')) {
        const { expandableTypes } = await toDescribedSchema('elasticsearch', api.input);
        for (const type of expandableTypes) {
          if (!stubbedBy.has(type)) {
            stubbedBy.set(type, api);
          }
        }
      }

      const problems: string[] = [];

      for (const [type, api] of stubbedBy) {
        const described = await toDescribedDefinition('elasticsearch', api.input, type);
        if (!described) {
          problems.push(`${type}: not found in the closure of "${api.id}"`);
          continue;
        }

        const unresolved = crossFileRefs(described.schema);
        if (unresolved.length > 0) {
          problems.push(`${type}: unresolved ${unresolved.join(', ')}`);
        }
        if (containsKey(described.schema, 'x-found-in')) {
          problems.push(`${type}: kept a routing annotation`);
        }

        const chars = JSON.stringify(described.schema).length;
        if (chars > MAX_DESCRIBED_CHARS) {
          problems.push(`${type}: ${chars}`);
        }
      }

      expect(problems).toEqual([]);
    });

    it('spells out the query types the search API only stubbed', async () => {
      const { elasticsearch } = await getRegistries();
      const { definition } = await elasticsearch.loadApi('search');

      const described = await toDescribedDefinition(
        'elasticsearch',
        definition.input!,
        '_types.query_dsl__QueryContainer'
      );

      const properties = described!.schema.properties as Record<string, Record<string, unknown>>;
      expect(Object.keys(properties)).toEqual(expect.arrayContaining(['bool', 'range', 'term']));

      expect(properties.bool).toEqual(
        expect.objectContaining({
          'x-expandable': '_types.query_dsl__BoolQuery',
          'x-properties': expect.arrayContaining(['filter', 'must', 'must_not', 'should']),
        })
      );
      expect(described!.expandableTypes).toContain('_types.query_dsl__BoolQuery');
    });

    it('returns nothing for a type the API does not reach', async () => {
      const { elasticsearch } = await getRegistries();
      const { definition } = await elasticsearch.loadApi('cluster.health');

      await expect(
        toDescribedDefinition('elasticsearch', definition.input!, 'NotAType')
      ).resolves.toBeUndefined();
    });
  });

  describe('NDJSON APIs', () => {
    it.each(['bulk', 'msearch'])(
      '%s still models no body parameter, which is why execute refuses it',
      async (id) => {
        // If this starts failing, upstream has added a way to supply the payload and the NDJSON
        // refusal in execute.ts can be revisited.
        const { elasticsearch } = await getRegistries();
        const { definition } = await elasticsearch.loadApi(id);

        expect(definition.bodyFormat).toBe('ndjson');

        const properties = (definition.input?.properties ?? {}) as Record<
          string,
          { 'x-found-in'?: string }
        >;
        const locations = Object.values(properties).map((spec) => spec['x-found-in']);
        expect(locations).not.toContain('body');
      }
    );
  });
});

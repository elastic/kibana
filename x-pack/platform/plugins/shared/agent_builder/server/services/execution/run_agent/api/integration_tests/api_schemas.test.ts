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
import { prepareApiRequest } from '../prepare_request';
import { isRecord } from '../types';
import type { ApiRegistryDefinition } from '../types';

// Ceiling for a described API schema, and for the expansion of any type it stubs.
const MAX_DESCRIBED_CHARS = 40_000;

interface ApiInput {
  id: string;
  input: Record<string, unknown>;
}

interface LoadedApiDefinition {
  id: string;
  definition: ApiRegistryDefinition;
}

interface ParamRouting {
  name: string;
  foundIn?: string;
  isBodyRoot: boolean;
  type?: string;
}

const loadApiDefinitions = async (target: ApiTarget): Promise<LoadedApiDefinition[]> => {
  const registries = await getRegistries();
  const registry = registries[target];
  const definitions: LoadedApiDefinition[] = [];

  for (const meta of registry.manifest) {
    const { definition } = await registry.loadApi(meta.id);
    definitions.push({ id: meta.id, definition });
  }

  return definitions;
};

const loadApiInputs = async (target: ApiTarget): Promise<ApiInput[]> => {
  const inputs: ApiInput[] = [];

  for (const { id, definition } of await loadApiDefinitions(target)) {
    if (definition.input) {
      inputs.push({ id, input: definition.input });
    }
  }

  return inputs;
};

const loadNdjsonApis = async (target: ApiTarget): Promise<ApiInput[]> =>
  (await loadApiDefinitions(target))
    .filter(({ definition }) => definition.bodyFormat === 'ndjson')
    .map(({ id, definition }) => ({ id, input: definition.input ?? {} }));

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

const paramRoutings = (input: ApiRegistryDefinition['input']): ParamRouting[] => {
  const properties = input?.properties;
  if (!isRecord(properties)) {
    return [];
  }
  return Object.entries(properties).map(([name, spec]) => {
    const { 'x-found-in': foundIn, 'x-body-root': bodyRoot, type } = isRecord(spec) ? spec : {};
    return {
      name,
      ...(typeof foundIn === 'string' ? { foundIn } : {}),
      isBodyRoot: bodyRoot === true,
      ...(typeof type === 'string' ? { type } : {}),
    };
  });
};

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

  describe('body-root payloads', () => {
    it.each<ApiTarget>(['elasticsearch', 'kibana'])(
      'gives every %s API at most one body-root parameter, alone in the body',
      async (target) => {
        const problems: string[] = [];

        for (const { id, definition } of await loadApiDefinitions(target)) {
          const params = paramRoutings(definition.input);
          const bodyRoots = params.filter(({ isBodyRoot }) => isBodyRoot);
          if (bodyRoots.length === 0) {
            continue;
          }

          const rootNames = bodyRoots.map(({ name }) => name);
          if (rootNames.length > 1) {
            problems.push(`${id}: ${rootNames.join(', ')}`);
          }

          const alongside = params.filter(
            ({ name, foundIn }) => foundIn === 'body' && !rootNames.includes(name)
          );
          if (alongside.length > 0) {
            problems.push(
              `${id}: "${rootNames.join(', ')}" shares the body with ${alongside
                .map(({ name }) => name)
                .join(', ')}`
            );
          }
        }

        expect(problems).toEqual([]);
      }
    );

    it.each([
      ['bulk', 'operations'],
      ['msearch', 'searches'],
    ])('%s takes its NDJSON payload in the "%s" parameter', async (id, param) => {
      const { elasticsearch } = await getRegistries();
      const { definition } = await elasticsearch.loadApi(id);

      expect(definition.bodyFormat).toBe('ndjson');
      expect(paramRoutings(definition.input).filter(({ isBodyRoot }) => isBodyRoot)).toEqual([
        { name: param, foundIn: 'body', isBodyRoot: true, type: 'array' },
      ]);
    });

    it('models every Elasticsearch NDJSON payload as a single body-root array', async () => {
      // `dispatchApiRequest` forwards that array as the client's `bulkBody`, which serializes it
      // into newline-delimited lines, so any other shape would leave the payload out of the request.
      const apis = await loadNdjsonApis('elasticsearch');
      const problems = apis
        .filter(({ input }) => {
          const bodyRoots = paramRoutings(input).filter(({ isBodyRoot }) => isBodyRoot);
          return bodyRoots.length !== 1 || bodyRoots[0].type !== 'array';
        })
        .map(({ id }) => id);

      expect(problems).toEqual([]);
      expect(apis.length).toBeGreaterThan(0);
    });

    it('ships no NDJSON API on Kibana, whose dispatch never sends one', async () => {
      const apis = await loadNdjsonApis('kibana');

      expect(apis.map(({ id }) => id)).toEqual([]);
    });

    it('sends an indexed document as the body itself, not wrapped in its parameter name', async () => {
      const prepared = await prepareApiRequest({
        target: 'elasticsearch',
        api: 'index',
        params: { index: 'logs', id: '1', document: { field: 1 } },
        spaceId: 'default',
      });

      expect(prepared).toEqual(
        expect.objectContaining({
          status: 'prepared',
          request: expect.objectContaining({ body: { field: 1 } }),
        })
      );
    });

    it('sends a Kibana body-root payload as the body itself', async () => {
      const prepared = await prepareApiRequest({
        target: 'kibana',
        api: 'tags.post-tags',
        params: { body: { name: 'my-tag', color: '#ffffff', description: '' } },
        spaceId: 'default',
      });

      expect(prepared).toEqual(
        expect.objectContaining({
          status: 'prepared',
          request: expect.objectContaining({
            body: { name: 'my-tag', color: '#ffffff', description: '' },
          }),
        })
      );
    });

    it('hands the bulk payload over as the array the NDJSON body is built from', async () => {
      const operations = [{ index: { _index: 'logs' } }, { field: 1 }];
      const prepared = await prepareApiRequest({
        target: 'elasticsearch',
        api: 'bulk',
        params: { index: 'logs', operations },
        spaceId: 'default',
      });

      expect(prepared).toEqual(
        expect.objectContaining({
          status: 'prepared',
          request: expect.objectContaining({ bulkBody: operations }),
        })
      );
    });
  });
});

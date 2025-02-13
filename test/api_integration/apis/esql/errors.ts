/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';
import expect from '@kbn/expect';
import { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { REPO_ROOT } from '@kbn/repo-info';
import uniqBy from 'lodash/uniqBy';
import { groupBy, mapValues } from 'lodash';
import { FtrProviderContext } from '../../ftr_provider_context';

function getConfigPath() {
  return Path.resolve(
    REPO_ROOT,
    'src/platform/packages/shared/kbn-esql-validation-autocomplete/src/validation'
  );
}

function getSetupPath() {
  return Path.resolve(getConfigPath(), 'esql_validation_meta_tests.json');
}

function getMissmatchedPath() {
  return Path.resolve(getConfigPath(), 'esql_validation_missmatches.json');
}

function readSetupFromESQLPackage() {
  const esqlPackagePath = getSetupPath();
  const json = Fs.readFileSync(esqlPackagePath, 'utf8');
  const esqlPackage = JSON.parse(json);
  return esqlPackage;
}

function createIndexRequest(
  index: string,
  fields: Array<{ name: string; type: string }>,
  stringType: 'text' | 'keyword',
  numberType: 'integer' | 'double' | 'long' | 'unsigned_long'
) {
  return {
    index,
    mappings: {
      properties: fields.reduce(
        (memo: Record<string, MappingProperty>, { name, type }: { name: string; type: string }) => {
          let esType = type;
          if (type === 'string') {
            esType = stringType;
          }
          if (type === 'number') {
            esType = numberType;
          }
          if (type === 'cartesian_point') {
            esType = 'point';
          }
          if (type === 'cartesian_shape') {
            esType = 'shape';
          }
          if (type === 'unsupported' || type === 'function_named_parameters') {
            esType = 'integer_range';
          }
          memo[name] = { type: esType } as MappingProperty;
          return memo;
        },
        {}
      ),
    },
  };
}

interface JSONConfig {
  testCases: Array<{ query: string; error: string[] }>;
  indexes: string[];
  policies: Array<{
    name: string;
    sourceIndices: string[];
    matchField: string;
    enrichFields: string[];
  }>;
  unsupported_field: Array<{ name: string; type: string }>;
  fields: Array<{ name: string; type: string }>;
  enrichFields: Array<{ name: string; type: string }>;
}

export interface EsqlResultColumn {
  name: string;
  type: string;
}

export type EsqlResultRow = Array<string | null>;

export interface EsqlTable {
  columns: EsqlResultColumn[];
  values: EsqlResultRow[];
}

function parseConfig(config: JSONConfig) {
  return {
    queryToErrors: config.testCases,
    indexes: config.indexes,
    policies: config.policies.map(({ name }: { name: string }) => name),
  };
}

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const log = getService('log');

  // Send raw ES|QL query directly to ES endpoint bypassing Kibana
  // as we do not need more overhead here
  async function sendESQLQuery(query: string): Promise<{
    resp: EsqlTable | undefined;
    error: { message: string } | undefined;
  }> {
    try {
      const resp = await es.transport.request<EsqlTable>({
        method: 'POST',
        path: '/_query',
        body: {
          query,
        },
      });
      return { resp, error: undefined };
    } catch (e) {
      return { resp: undefined, error: { message: e.meta.body.error.root_cause[0].reason } };
    }
  }

  describe('error messages', () => {
    const config = readSetupFromESQLPackage();
    const { queryToErrors, indexes, policies } = parseConfig(config);

    const missmatches: Array<{ query: string; error: string }> = [];
    // Swap these for DEBUG/further investigation on ES bugs
    const stringVariants = ['text', 'keyword'] as const;
    const numberVariants = ['integer', 'long', 'double', 'long'] as const;

    async function cleanup() {
      // clean it up all indexes and policies
      log.info(`cleaning up all indexes: ${indexes.join(', ')}`);
      await es.indices.delete({ index: indexes, ignore_unavailable: true }, { ignore: [404] });
      await es.indices.delete(
        { index: config.policies[0].sourceIndices[0], ignore_unavailable: true },
        { ignore: [404] }
      );
      for (const policy of policies) {
        log.info(`deleting policy "${policy}"...`);
        // TODO: Maybe `policy` -> `policy.name`?
        await es.enrich.deletePolicy({ name: policy }, { ignore: [404] });
      }
    }

    after(async () => {
      if (missmatches.length) {
        const distinctMissmatches = uniqBy(
          missmatches,
          (missmatch) => missmatch.query + missmatch.error
        );
        const missmatchesGrouped = mapValues(
          groupBy(distinctMissmatches, (missmatch) => missmatch.error),
          (list) => list.map(({ query }) => query)
        );
        log.info(`writing ${Object.keys(missmatchesGrouped).length} missmatches to file...`);
        Fs.writeFileSync(getMissmatchedPath(), JSON.stringify(missmatchesGrouped, null, 2));
      }
    });

    for (const stringFieldType of stringVariants) {
      for (const numberFieldType of numberVariants) {
        describe(`Using string field type: ${stringFieldType} and number field type: ${numberFieldType}`, () => {
          before(async () => {
            await cleanup();

            log.info(`creating ${indexes.length} indexes...`);

            for (const index of indexes) {
              // setup all indexes, mappings and policies here
              log.info(
                `creating a index "${index}" with mapping...\n${JSON.stringify(config.fields)}`
              );
              const fieldsExcludingCounterType = config.fields.filter(
                // ES|QL supports counter_integer, counter_long, counter_double, date_period, etc.
                // but they are not types suitable for Elasticsearch indices
                (c: { type: string }) =>
                  !c.type.startsWith('counter_') &&
                  c.type !== 'date_period' &&
                  c.type !== 'time_duration' &&
                  c.type !== 'null' &&
                  c.type !== 'time_literal'
              );
              await es.indices.create(
                createIndexRequest(
                  index,
                  /unsupported/.test(index) ? config.unsupported_field : fieldsExcludingCounterType,
                  stringFieldType,
                  numberFieldType
                ),
                { ignore: [409] }
              );
            }

            for (const { sourceIndices, matchField } of config.policies.slice(0, 1)) {
              const enrichFields = [{ name: matchField, type: 'string' }].concat(
                config.enrichFields
              );
              log.info(`creating a index "${sourceIndices[0]}" for policy with mapping...`);
              await es.indices.create(
                createIndexRequest(
                  sourceIndices[0],
                  enrichFields,
                  stringFieldType,
                  numberFieldType
                ),
                {
                  ignore: [409],
                }
              );
            }

            log.info(`creating ${policies.length} policies...`);
            for (const { name, sourceIndices, matchField, enrichFields } of config.policies) {
              log.info(`creating a policy "${name}"...`);
              await es.enrich.putPolicy(
                {
                  name,
                  body: {
                    match: {
                      indices: sourceIndices,
                      match_field: matchField,
                      enrich_fields: enrichFields,
                    },
                  },
                },
                { ignore: [409] }
              );
              log.info(`executing policy "${name}"...`);
              await es.enrich.executePolicy({ name });
            }
          });

          after(async () => {
            await cleanup();
          });

          it(`Checking error messages`, async () => {
            for (const { query, error } of queryToErrors) {
              const jsonBody = await sendESQLQuery(query);

              const clientSideHasError = Boolean(error.length);
              const serverSideHasError = Boolean(jsonBody.error);

              if (clientSideHasError !== serverSideHasError) {
                if (clientSideHasError) {
                  // in this case it's a problem, so fail the test
                  expect().fail(`Client side errored but ES server did not: ${query}`);
                }
                if (serverSideHasError) {
                  // in this case client side validator can improve, but it's not hard failure
                  // rather log it as it can be a useful to investigate a bug on the ES implementation side for some type combination
                  missmatches.push({ query, error: jsonBody.error!.message });
                }
              }
            }
          });
        });
      }
    }
  });
}

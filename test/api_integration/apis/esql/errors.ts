/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';
import Path from 'path';
import expect from '@kbn/expect';
import request from 'superagent';
import { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { inflateResponse } from '@kbn/bfetch-plugin/public/streaming';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { BFETCH_ROUTE_VERSION_LATEST } from '@kbn/bfetch-plugin/common';
import { REPO_ROOT } from '@kbn/repo-info';
import uniqBy from 'lodash/uniqBy';
import { groupBy, mapValues } from 'lodash';
import { FtrProviderContext } from '../../ftr_provider_context';

function parseBfetchResponse(resp: request.Response, compressed: boolean = false) {
  return resp.text
    .trim()
    .split('\n')
    .map((item) => {
      return JSON.parse(compressed ? inflateResponse<any>(item) : item);
    });
}

function getConfigPath() {
  return Path.resolve(REPO_ROOT, 'packages', 'kbn-esql', 'src', 'lib', 'validation');
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
          if (type === 'unsupported') {
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

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  describe('error messages', () => {
    const queryToErrors: Array<{ query: string; error: boolean }> = [];
    const config = readSetupFromESQLPackage();
    queryToErrors.push(...config.testCases);
    const indexes: string[] = config.indexes;
    const policies: string[] = config.policies.map(({ name }: { name: string }) => name);
    const missmatches: Array<{ query: string; error: string }> = [];
    // Swap these for DEBUG/further investigation on ES bugs
    // const stringVariants = ['text', 'keyword'] as const;
    // const numberVariants = ['integer', 'long', 'double', 'long'] as const;
    const stringVariants = ['keyword'] as const;
    const numberVariants = ['integer'] as const;

    async function cleanup() {
      // clean it up all indexes and policies
      log.info(`cleaning up all indexes: ${indexes.join(', ')}`);
      await es.indices.delete({ index: indexes }, { ignore: [404] });
      await es.indices.delete({ index: config.policies[0].sourceIndices[0] }, { ignore: [404] });
      for (const policy of policies) {
        log.info(`deleting policy "${policy}"...`);
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
            await esArchiver.emptyKibanaIndex();
            await cleanup();

            log.info(`creating ${indexes.length} indexes...`);

            for (const index of indexes) {
              // setup all indexes, mappings and policies here
              log.info(`creating a index "${index}" with mapping...`);
              await es.indices.create(
                createIndexRequest(
                  index,
                  /unsupported/.test(index) ? config.unsupported_field : config.fields,
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

          for (const { query, error } of queryToErrors) {
            it(`Checking error message for: "${query}" => ${error ? '❌' : '☑️'}`, async () => {
              const resp = await supertest
                .post(`/internal/bsearch`)
                .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
                .send({
                  batch: [
                    {
                      request: {
                        params: {
                          query,
                        },
                      },
                      options: {
                        strategy: 'esql',
                      },
                    },
                  ],
                });

              const jsonBody = parseBfetchResponse(resp);

              const clientSideHasError = error;
              const serverSideHasError = Boolean(jsonBody[0].error);

              if (clientSideHasError !== serverSideHasError) {
                if (clientSideHasError) {
                  // in this case it's a problem, so fail the test
                  expect().fail(`Client side errored but ES server did not: ${query}`);
                }
                if (serverSideHasError) {
                  // in this case client side validator can improve, but it's not hard failure
                  // rather log it as it can be a useful to investigate a bug on the ES implementation side for some type combination
                  missmatches.push({ query, error: jsonBody[0].error.message });
                }
              }
            });
          }
        });
      }
    }
  });
}

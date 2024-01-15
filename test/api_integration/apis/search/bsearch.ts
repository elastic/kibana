/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import request from 'superagent';
import { inflateResponse } from '@kbn/bfetch-plugin/public/streaming';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { BFETCH_ROUTE_VERSION_LATEST } from '@kbn/bfetch-plugin/common';
import { writeFile } from 'node:fs/promises';
import path from 'path';
import { ESLint } from 'eslint';
import { FtrProviderContext } from '../../ftr_provider_context';
import { painlessErrReq } from './painless_err_req';
import { verifyErrorResponse } from './verify_error';

function parseBfetchResponse(resp: request.Response, compressed: boolean = false) {
  return resp.text
    .trim()
    .split('\n')
    .map((item) => {
      return JSON.parse(compressed ? inflateResponse<any>(item) : item);
    });
}

const toCamelcase = (string: string) => {
  return string.replace(/([_][a-z])/gi, (match) => {
    return match.toUpperCase().replace('_', '');
  });
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('bsearch', () => {
    describe('post', () => {
      it('should return 200 a single response', async () => {
        const resp = await supertest
          .post(`/internal/bsearch`)
          .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
          .send({
            batch: [
              {
                request: {
                  params: {
                    index: '.kibana',
                    body: {
                      query: {
                        match_all: {},
                      },
                    },
                  },
                },
                options: {
                  strategy: 'es',
                },
              },
            ],
          });

        const jsonBody = parseBfetchResponse(resp);

        expect(resp.status).to.be(200);
        expect(jsonBody[0].id).to.be(0);
        expect(jsonBody[0].result.isPartial).to.be(false);
        expect(jsonBody[0].result.isRunning).to.be(false);
        expect(jsonBody[0].result).to.have.property('rawResponse');
      });

      it('should return 200 a single response from compressed', async () => {
        const resp = await supertest
          .post(`/internal/bsearch?compress=true`)
          .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
          .send({
            batch: [
              {
                request: {
                  params: {
                    index: '.kibana',
                    body: {
                      query: {
                        match_all: {},
                      },
                    },
                  },
                },
                options: {
                  strategy: 'es',
                },
              },
            ],
          });

        const jsonBody = parseBfetchResponse(resp, true);

        expect(resp.status).to.be(200);
        expect(jsonBody[0].id).to.be(0);
        expect(jsonBody[0].result.isPartial).to.be(false);
        expect(jsonBody[0].result.isRunning).to.be(false);
        expect(jsonBody[0].result).to.have.property('rawResponse');
      });

      it('should return a batch of successful responses', async () => {
        const resp = await supertest
          .post(`/internal/bsearch`)
          .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
          .send({
            batch: [
              {
                request: {
                  params: {
                    index: '.kibana',
                    body: {
                      query: {
                        match_all: {},
                      },
                    },
                  },
                },
              },
              {
                request: {
                  params: {
                    index: '.kibana',
                    body: {
                      query: {
                        match_all: {},
                      },
                    },
                  },
                },
              },
            ],
          });

        expect(resp.status).to.be(200);
        const parsedResponse = parseBfetchResponse(resp);
        expect(parsedResponse).to.have.length(2);
        parsedResponse.forEach((responseJson) => {
          expect(responseJson.result).to.have.property('isPartial');
          expect(responseJson.result).to.have.property('isRunning');
          expect(responseJson.result).to.have.property('rawResponse');
        });
      });

      it('should return error for not found strategy', async () => {
        const resp = await supertest
          .post(`/internal/bsearch`)
          .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
          .send({
            batch: [
              {
                request: {
                  params: {
                    index: '.kibana',
                    body: {
                      query: {
                        match_all: {},
                      },
                    },
                  },
                },
                options: {
                  strategy: 'wtf',
                },
              },
            ],
          });

        expect(resp.status).to.be(200);
        parseBfetchResponse(resp).forEach((responseJson, i) => {
          expect(responseJson.id).to.be(i);
          verifyErrorResponse(responseJson.error, 404, 'Search strategy wtf not found');
        });
      });

      it('should return 400 when index type is provided in "es" strategy', async () => {
        const resp = await supertest
          .post(`/internal/bsearch`)
          .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
          .send({
            batch: [
              {
                request: {
                  index: '.kibana',
                  indexType: 'baad',
                  params: {
                    body: {
                      query: {
                        match_all: {},
                      },
                    },
                  },
                },
                options: {
                  strategy: 'es',
                },
              },
            ],
          });

        expect(resp.status).to.be(200);
        parseBfetchResponse(resp).forEach((responseJson, i) => {
          expect(responseJson.id).to.be(i);
          verifyErrorResponse(responseJson.error, 400, 'Unsupported index pattern type baad');
        });
      });

      describe('painless', () => {
        before(async () => {
          await esArchiver.loadIfNeeded('test/functional/fixtures/es_archiver/logstash_functional');
        });

        after(async () => {
          await esArchiver.unload('test/functional/fixtures/es_archiver/logstash_functional');
        });
        it('should return 400 "search_phase_execution_exception" for Painless error in "es" strategy', async () => {
          const resp = await supertest
            .post(`/internal/bsearch`)
            .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
            .send({
              batch: [
                {
                  request: painlessErrReq,
                  options: {
                    strategy: 'es',
                  },
                },
              ],
            });

          expect(resp.status).to.be(200);
          parseBfetchResponse(resp).forEach((responseJson, i) => {
            expect(responseJson.id).to.be(i);
            verifyErrorResponse(responseJson.error, 400, 'search_phase_execution_exception', true);
          });
        });
      });

      describe('request meta', () => {
        describe('es', () => {
          it(`should return request meta`, async () => {
            const resp = await supertest
              .post(`/internal/bsearch`)
              .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
              .send({
                batch: [
                  {
                    request: {
                      params: {
                        index: '.kibana',
                        body: {
                          query: {
                            match_all: {},
                          },
                        },
                      },
                    },
                    options: {
                      strategy: 'es',
                    },
                  },
                ],
              });

            const jsonBody = parseBfetchResponse(resp);

            expect(resp.status).to.be(200);
            expect(jsonBody[0].result.requestParams).to.eql({
              method: 'POST',
              path: '/.kibana/_search',
              querystring: 'ignore_unavailable=true',
            });
          });

          it(`should return request meta when request fails`, async () => {
            const resp = await supertest
              .post(`/internal/bsearch`)
              .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
              .send({
                batch: [
                  {
                    request: {
                      params: {
                        index: '.kibana',
                        body: {
                          query: {
                            bool: {
                              filter: [
                                {
                                  error_query: {
                                    indices: [
                                      {
                                        error_type: 'exception',
                                        message: 'simulated failure',
                                        name: '.kibana',
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                    },
                    options: {
                      strategy: 'es',
                    },
                  },
                ],
              });

            const jsonBody = parseBfetchResponse(resp);

            expect(resp.status).to.be(200);
            expect(jsonBody[0].error.attributes.requestParams).to.eql({
              method: 'POST',
              path: '/.kibana/_search',
              querystring: 'ignore_unavailable=true',
            });
          });
        });

        describe('ese', () => {
          it(`should return request meta`, async () => {
            const resp = await supertest
              .post(`/internal/bsearch`)
              .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
              .send({
                batch: [
                  {
                    request: {
                      params: {
                        index: '.kibana',
                        body: {
                          query: {
                            match_all: {},
                          },
                        },
                      },
                    },
                    options: {
                      strategy: 'ese',
                    },
                  },
                ],
              });

            const jsonBody = parseBfetchResponse(resp);

            expect(resp.status).to.be(200);
            expect(jsonBody[0].result.requestParams).to.eql({
              method: 'POST',
              path: '/.kibana/_async_search',
              querystring:
                'batched_reduce_size=64&ccs_minimize_roundtrips=true&wait_for_completion_timeout=200ms&keep_on_completion=false&keep_alive=60000ms&ignore_unavailable=true',
            });
          });

          it(`should return request meta when request fails`, async () => {
            const resp = await supertest
              .post(`/internal/bsearch`)
              .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
              .send({
                batch: [
                  {
                    request: {
                      params: {
                        index: '.kibana',
                        body: {
                          bool: {
                            filter: [
                              {
                                error_query: {
                                  indices: [
                                    {
                                      error_type: 'exception',
                                      message: 'simulated failure',
                                      name: '.kibana',
                                    },
                                  ],
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                    options: {
                      strategy: 'ese',
                    },
                  },
                ],
              });

            const jsonBody = parseBfetchResponse(resp);

            expect(resp.status).to.be(200);
            expect(jsonBody[0].error.attributes.requestParams).to.eql({
              method: 'POST',
              path: '/.kibana/_async_search',
              querystring:
                'batched_reduce_size=64&ccs_minimize_roundtrips=true&wait_for_completion_timeout=200ms&keep_on_completion=false&keep_alive=60000ms&ignore_unavailable=true',
            });
          });
        });

        describe('esql', () => {
          it(`should return request meta`, async () => {
            const resp = await supertest
              .post(`/internal/bsearch`)
              .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
              .send({
                batch: [
                  {
                    request: {
                      params: {
                        query: 'from .kibana | limit 1',
                      },
                    },
                    options: {
                      strategy: 'esql',
                    },
                  },
                ],
              });

            const jsonBody = parseBfetchResponse(resp);

            expect(resp.status).to.be(200);
            expect(jsonBody[0].result.requestParams).to.eql({
              method: 'POST',
              path: '/_query',
            });
          });

          it(`should return request meta when request fails`, async () => {
            const resp = await supertest
              .post(`/internal/bsearch`)
              .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
              .send({
                batch: [
                  {
                    request: {
                      params: {
                        query: 'fro .kibana | limit 1',
                      },
                    },
                    options: {
                      strategy: 'esql',
                    },
                  },
                ],
              });

            const jsonBody = parseBfetchResponse(resp);

            expect(resp.status).to.be(200);
            expect(jsonBody[0].error.attributes.requestParams).to.eql({
              method: 'POST',
              path: '/_query',
            });
          });

          it.only('auto generate ES|QL function definitions', async () => {
            const resp = await supertest
              .post(`/internal/bsearch`)
              .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
              .send({
                batch: [
                  {
                    request: {
                      params: {
                        query: 'show functions',
                      },
                    },
                    options: {
                      strategy: 'esql',
                    },
                  },
                ],
              });

            const jsonBody = parseBfetchResponse(resp);

            expect(resp.status).to.be(200);
            expect(jsonBody[0].result.requestParams).to.eql({
              method: 'POST',
              path: '/_query',
            });

            const numberType = ['double', 'unsigned_long', 'long', 'integer'];
            const stringType = ['text', 'keyword'];
            const replaceType = (
              expectedTypes: string[],
              types: string | null,
              newType: string
            ) => {
              if (types == null) {
                return '';
              }
              const removedType = expectedTypes.reduce((memo, nType) => {
                return memo.replace(new RegExp(`${nType}\\|?`), '');
              }, types);
              return expectedTypes.some((n) => types.includes(n))
                ? `${newType}${removedType.length ? '|' : ''}${removedType}`
                : removedType;
            };
            const convertToJsType = (type: string) => {
              if (type === '?') {
                return 'any';
              }
              const tasks: Array<[string, string[]]> = [
                ['number', numberType],
                ['string', stringType],
              ];
              let finalType = type;
              for (const [newType, expectedTypes] of tasks) {
                finalType = replaceType(expectedTypes, finalType, newType);
              }
              return finalType[finalType.length - 1] === '|' ? finalType.slice(0, -1) : finalType;
            };

            const convertToSignatureString = (signature: FunctionDefinition) => `
            {
              name: '${signature.name}',
              ${signature.alias ? ` alias: ${JSON.stringify(signature.alias)},` : ''}
              supportedCommands: ${JSON.stringify(signature.supportedCommands)},
              description: i18n.translate('monaco.esql.definitions.${toCamelcase(
                signature.name
              )}Doc', {
                defaultMessage:
                  '${signature.description}',
              }),
              signatures: ${JSON.stringify(signature.signatures)},
            }`;

            const columns: string[] = jsonBody[0].result.rawResponse.columns.map(
              ({ name }: { name: string }) => name
            );

            interface FunctionType {
              synopsis: string;
              name: string;
              argNames: string[];
              argTypes: string[];
              returnType: string;
              argDescription: string[];
              optionalArgs: boolean[];
              variadic: boolean;
              isAggregation: boolean;
              description: string;
            }

            interface FunctionDefinition {
              name: string;
              description: string;
              alias?: string[];
              supportedCommands: ['stats'] | ['eval', 'where', 'row'];
              signatures: Array<{
                params: Array<{
                  name: string;
                  type: string;
                  optional?: boolean;
                  noNestingFunctions?: boolean;
                }>;
                returnType: string;
                examples: string[];
                infiniteParams?: boolean;
                minParams?: number;
              }>;
            }

            const arrayColumns = ['argNames', 'argTypes', 'argDescription', 'optionalArgs'];

            const definitions: FunctionDefinition[] = [];

            /*
             * Some overrides to handle some special cases
             */
            const aliases = {
              to_version: ['to_ver'],
              to_unsigned_long: ['to_ul', 'to_ulong'],
              to_boolean: ['to_bool'],
              to_string: ['to_str'],
              to_datetime: ['to_dt'],
              to_double: ['to_dbl'],
              to_integer: ['to_int'],
            };
            const skipList = new Set(Object.values(aliases).flat());
            const variadicExceptions = ['case'];
            const extraSignatureParams: Record<string, { minParams: number }> = {
              case: { minParams: 3 },
            };

            // Now carry on with the automagic mapping

            for (const values of jsonBody[0].result.rawResponse.values) {
              const record = columns.reduce((memo, name, index) => {
                if (arrayColumns.includes(name)) {
                  memo[name] = Array.isArray(values[index]) ? values[index] : [values[index]];
                } else {
                  memo[name] = values[index];
                }
                return memo;
              }, {} as Record<string, string | boolean>) as unknown as FunctionType;

              // skip aliases
              if (skipList.has(record.name)) {
                continue;
              }

              const returnTypeMapped = convertToJsType(record.returnType).split('|');
              const convertedArgTypes = record.argTypes.map(convertToJsType);
              const signatureCardinality =
                convertedArgTypes.length > 0 && convertedArgTypes[0] !== ''
                  ? convertedArgTypes.reduce((signaturesCount, argType) => {
                      return signaturesCount > argType.split('|').length
                        ? signaturesCount
                        : argType.split('|').length;
                    }, returnTypeMapped.length)
                  : 0;

              const signatures = Array(signatureCardinality)
                .fill(0)
                .map((_, index) => {
                  const params = convertedArgTypes.flatMap((argType, argIndex) => {
                    const detailedTypes = argType.split('|');
                    if (detailedTypes.length === 1) {
                      return {
                        name: record.argNames[argIndex],
                        type: argType,
                        ...(record.optionalArgs[argIndex]
                          ? { optional: record.optionalArgs[argIndex] }
                          : {}),
                        ...(record.isAggregation ? { noNestingFunctions: true } : {}),
                        // special count logic
                        ...(record.name === 'count' && argIndex === 0
                          ? { supportsWildcard: true }
                          : {}),
                      };
                    }
                    return {
                      name: record.argNames[argIndex],
                      type: detailedTypes[index],
                      ...(record.optionalArgs.length
                        ? { optional: record.optionalArgs[argIndex] || record.optionalArgs[0] }
                        : {}),
                      ...(record.isAggregation ? { noNestingFunctions: true } : {}),
                      // special count logic
                      ...(record.name === 'count' && argIndex === 0
                        ? { supportsWildcard: true }
                        : {}),
                    };
                  });

                  return {
                    // variadic functions in ES have the ...rest argument (or similar) with the same type
                    // which is not present in Kibana definitions.
                    // the only exception is "case"
                    params:
                      record.variadic && !variadicExceptions.includes(record.name)
                        ? [params[0]]
                        : params,
                    returnType: returnTypeMapped[index] || returnTypeMapped[0],
                    examples: [],
                    ...(record.variadic ? { infiniteParams: true } : {}),
                    ...(record.name in extraSignatureParams
                      ? extraSignatureParams[record.name]
                      : {}),
                  };
                });

              definitions.push({
                name: record.name,
                ...(record.name in aliases
                  ? { alias: aliases[record.name as keyof typeof aliases] }
                  : {}),
                supportedCommands: record.isAggregation ? ['stats'] : ['eval', 'where', 'row'],
                description: record.description,
                signatures,
              });
            }

            const { functionStrings, aggregationStrings } = definitions
              .sort(({ name: a }, { name: b }) => a.localeCompare(b))
              .reduce(
                (memo, definition) => {
                  const propName =
                    definition.supportedCommands[0] === 'stats'
                      ? 'aggregationStrings'
                      : 'functionStrings';
                  memo[propName].push(convertToSignatureString(definition));
                  return memo;
                },
                { functionStrings: [], aggregationStrings: [] } as Record<
                  'functionStrings' | 'aggregationStrings',
                  string[]
                >
              );

            const eslint = new ESLint({
              fix: true,
              overrideConfig: {
                parser: '@typescript-eslint/parser',
                parserOptions: {
                  sourceType: 'module',
                  ecmaVersion: 2018,
                },
                rules: {
                  '@kbn/imports/no_unresolvable_imports': 'off',
                  '@kbn/eslint/require-license-header': [
                    'error',
                    {
                      license: `
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
`,
                    },
                  ],
                },
              },
            });
            for (const [defs, filePath] of [
              [functionStrings, 'functions'],
              [aggregationStrings, 'aggs'],
            ]) {
              const result = await eslint.lintText(`
import { i18n } from '@kbn/i18n';
import { FunctionDefinition } from './types';

export const ${
                filePath === 'functions' ? 'evalFunctions' : 'statsAggregationFunction'
              }Definitions: FunctionDefinition[] = [${(defs as string[]).join(', ')}];`);

              await writeFile(
                path.resolve(
                  __dirname,
                  `../../../../packages/kbn-monaco/src/esql/lib/ast/definitions/${filePath}.ts`
                ),
                result[0].output || ''
              );
            }
          });
        });

        describe('sql', () => {
          it(`should return request meta`, async () => {
            const resp = await supertest
              .post(`/internal/bsearch`)
              .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
              .send({
                batch: [
                  {
                    request: {
                      params: {
                        query: 'SELECT * FROM ".kibana" LIMIT 1',
                      },
                    },
                    options: {
                      strategy: 'sql',
                    },
                  },
                ],
              });

            const jsonBody = parseBfetchResponse(resp);

            expect(resp.status).to.be(200);
            expect(jsonBody[0].result.requestParams).to.eql({
              method: 'POST',
              path: '/_sql',
              querystring: 'format=json',
            });
          });

          it(`should return request meta when request fails`, async () => {
            const resp = await supertest
              .post(`/internal/bsearch`)
              .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
              .send({
                batch: [
                  {
                    request: {
                      params: {
                        query: 'SELEC * FROM ".kibana" LIMIT 1',
                      },
                    },
                    options: {
                      strategy: 'sql',
                    },
                  },
                ],
              });

            const jsonBody = parseBfetchResponse(resp);

            expect(resp.status).to.be(200);
            expect(jsonBody[0].error.attributes.requestParams).to.eql({
              method: 'POST',
              path: '/_sql',
              querystring: 'format=json',
            });
          });
        });

        describe('eql', () => {
          it(`should return request meta`, async () => {
            const resp = await supertest
              .post(`/internal/bsearch`)
              .set(ELASTIC_HTTP_VERSION_HEADER, BFETCH_ROUTE_VERSION_LATEST)
              .send({
                batch: [
                  {
                    request: {
                      params: {
                        index: '.kibana',
                        query: 'any where true',
                        timestamp_field: 'created_at',
                      },
                    },
                    options: {
                      strategy: 'eql',
                    },
                  },
                ],
              });

            const jsonBody = parseBfetchResponse(resp);

            expect(resp.status).to.be(200);
            expect(jsonBody[0].result.requestParams).to.eql({
              method: 'POST',
              path: '/.kibana/_eql/search',
              querystring: 'ignore_unavailable=true',
            });
          });
        });
      });
    });
  });
}

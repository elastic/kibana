/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeBuilder, toKqlExpression } from '@kbn/es-query';
import {
  buildAlertingV1RuleTemplateEngineFilter,
  buildConsumersFilter,
  buildFilter,
  buildRuleTypeIdsFilter,
  buildTemplateSearchQuery,
  buildTemplateSearchWildcardValue,
  combineFilterWithAuthorizationFilter,
  combineFilters,
  toSavedObjectEsQuery,
} from './filters';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';

describe('filters', () => {
  describe('combineFilterWithAuthorizationFilter', () => {
    it('returns undefined if neither a filter or authorizationFilter are passed', () => {
      expect(combineFilterWithAuthorizationFilter()).toBeUndefined();
    });

    it('returns a single KueryNode when only a filter is passed in', () => {
      const node = nodeBuilder.is('a', 'hello');
      expect(combineFilterWithAuthorizationFilter(node)).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "a",
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "hello",
            },
          ],
          "function": "is",
          "type": "function",
        }
      `);
    });

    it('returns a single KueryNode when only an authorizationFilter is passed in', () => {
      const node = nodeBuilder.is('a', 'hello');
      expect(combineFilterWithAuthorizationFilter(undefined, node)).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "a",
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "hello",
            },
          ],
          "function": "is",
          "type": "function",
        }
      `);
    });

    it("returns a single KueryNode and'ing together the passed in parameters", () => {
      const node = nodeBuilder.is('a', 'hello');
      const node2 = nodeBuilder.is('b', 'hi');

      expect(combineFilterWithAuthorizationFilter(node, node2)).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "a",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "hello",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "b",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "hi",
                },
              ],
              "function": "is",
              "type": "function",
            },
          ],
          "function": "and",
          "type": "function",
        }
      `);
    });

    it("returns a single KueryNode and'ing together the passed in parameters in opposite order", () => {
      const node = nodeBuilder.is('a', 'hello');
      const node2 = nodeBuilder.is('b', 'hi');

      expect(combineFilterWithAuthorizationFilter(node2, node)).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "b",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "hi",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "a",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "hello",
                },
              ],
              "function": "is",
              "type": "function",
            },
          ],
          "function": "and",
          "type": "function",
        }
      `);
    });
  });

  describe('buildFilter', () => {
    it('returns undefined if filters is undefined', () => {
      expect(
        buildFilter({
          filters: undefined,
          field: 'abc',
          operator: 'or',
          type: RULE_SAVED_OBJECT_TYPE,
        })
      ).toBeUndefined();
    });

    it('returns undefined if filters is is an empty array', () => {
      expect(
        buildFilter({ filters: [], field: 'abc', operator: 'or', type: RULE_SAVED_OBJECT_TYPE })
      ).toBeUndefined();
    });

    it('returns a KueryNode using or operator', () => {
      expect(
        buildFilter({
          filters: ['value1'],
          field: 'abc',
          operator: 'or',
          type: RULE_SAVED_OBJECT_TYPE,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "alert.attributes.abc",
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "value1",
            },
          ],
          "function": "is",
          "type": "function",
        }
      `);
    });

    it("returns multiple nodes or'd together", () => {
      expect(
        buildFilter({
          filters: ['value1', 'value2'],
          field: 'abc',
          operator: 'or',
          type: RULE_SAVED_OBJECT_TYPE,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "alert.attributes.abc",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "value1",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "alert.attributes.abc",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "value2",
                },
              ],
              "function": "is",
              "type": "function",
            },
          ],
          "function": "or",
          "type": "function",
        }
      `);
    });

    it('does not escape special kql characters in the filter values', () => {
      const specialCharacters = 'awesome:()\\<>"*';

      expect(
        buildFilter({
          filters: [specialCharacters],
          field: 'abc',
          operator: 'or',
          type: RULE_SAVED_OBJECT_TYPE,
        })
      ).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "alert.attributes.abc",
            },
            Object {
              "isQuoted": false,
              "type": "literal",
              "value": "awesome:()\\\\<>\\"*",
            },
          ],
          "function": "is",
          "type": "function",
        }
      `);
    });
  });

  describe('combineFilters', () => {
    it('returns undefined if the nodes are undefined or null', () => {
      expect(combineFilters([null, undefined])).toBeUndefined();
    });

    it('combines the filters correctly', () => {
      const node = nodeBuilder.is('a', 'hello');
      const node2 = nodeBuilder.is('b', 'hi');

      expect(combineFilters([node, null, undefined, node2])).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "a",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "hello",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "b",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "hi",
                },
              ],
              "function": "is",
              "type": "function",
            },
          ],
          "function": "and",
          "type": "function",
        }
      `);
    });

    it('combines the filters correctly with an operator', () => {
      const node = nodeBuilder.is('a', 'hello');
      const node2 = nodeBuilder.is('b', 'hi');

      expect(combineFilters([node, null, undefined, node2], 'or')).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "a",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "hello",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "b",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "hi",
                },
              ],
              "function": "is",
              "type": "function",
            },
          ],
          "function": "or",
          "type": "function",
        }
      `);
    });
  });

  describe('buildRuleTypeIdsFilter', () => {
    it('returns undefined if ruleTypeIds is undefined', () => {
      expect(buildRuleTypeIdsFilter()).toBeUndefined();
    });

    it('returns undefined if ruleTypeIds is is an empty array', () => {
      expect(buildRuleTypeIdsFilter([])).toBeUndefined();
    });

    it('builds the filter correctly', () => {
      expect(buildRuleTypeIdsFilter(['foo', 'bar'])).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "alert.attributes.alertTypeId",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "foo",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "alert.attributes.alertTypeId",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "bar",
                },
              ],
              "function": "is",
              "type": "function",
            },
          ],
          "function": "or",
          "type": "function",
        }
      `);
    });
  });

  describe('buildAlertingV1RuleTemplateEngineFilter', () => {
    it('matches engine v1 or missing engine', () => {
      expect(toKqlExpression(buildAlertingV1RuleTemplateEngineFilter())).toBe(
        '(alerting_rule_template.attributes.engine: v1 OR NOT alerting_rule_template.attributes.engine: *)'
      );
    });
  });

  describe('buildTemplateSearchQuery', () => {
    const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    /**
     * Same operators as ES `wildcard`: `*` any sequence, `\\` escapes the
     * next character. Used to lock AC / notes examples to the pattern we emit.
     */
    const matchesWildcard = (title: string, wildcardValue: string): boolean => {
      let regex = '';
      for (let i = 0; i < wildcardValue.length; i++) {
        const character = wildcardValue[i];
        if (character === '\\' && i + 1 < wildcardValue.length) {
          regex += escapeRegex(wildcardValue[i + 1]);
          i += 1;
          continue;
        }
        if (character === '*') {
          regex += '.*';
          continue;
        }
        regex += escapeRegex(character);
      }
      return new RegExp(`^${regex}$`, 'i').test(title);
    };

    const expectMatch = (title: string, search: string, shouldMatch: boolean) => {
      const value = buildTemplateSearchWildcardValue(search);
      expect(value).toBeDefined();
      if (!value) {
        return;
      }
      expect(matchesWildcard(title, value)).toBe(shouldMatch);
    };

    it('returns undefined when search is empty or only quotes', () => {
      expect(buildTemplateSearchQuery()).toBeUndefined();
      expect(buildTemplateSearchQuery('')).toBeUndefined();
      expect(buildTemplateSearchQuery('   ')).toBeUndefined();
      expect(buildTemplateSearchQuery('""')).toBeUndefined();
    });

    it('emits a wildcard on name.keyword and tags, keeping spaces', () => {
      expect(buildTemplateSearchQuery('idle data')).toEqual({
        bool: {
          should: [
            {
              wildcard: {
                'alerting_rule_template.name.keyword': { value: '*idle data*' },
              },
            },
            {
              wildcard: {
                'alerting_rule_template.tags': {
                  value: '*idle data*',
                  case_insensitive: true,
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    });

    describe('acceptance criteria: "Kubernetes idle data threshold"', () => {
      const title = 'Kubernetes idle data threshold';

      it.each([
        ['kub', true],
        ['thresh', true],
        ['idle data', true],
        ['data thresh', true],
        ['kub*', true],
        ['*kub*', true],
      ] as const)('"%s" matches', (search, shouldMatch) => {
        expectMatch(title, search, shouldMatch);
      });
    });

    describe('notes examples', () => {
      it('kub matches [Kubernetes OTel] Container CPU throttling', () => {
        expectMatch('[Kubernetes OTel] Container CPU throttling', 'kub', true);
      });

      it('idle data matches Idle data streams as a literal substring', () => {
        expect(buildTemplateSearchWildcardValue('idle data')).toBe('*idle data*');
        expectMatch('Idle data streams', 'idle data', true);
      });

      it('CPU threshold does not match across extra words', () => {
        expect(buildTemplateSearchWildcardValue('CPU threshold')).toBe('*CPU threshold*');
        expectMatch('CPU average combined with latency threshold', 'CPU threshold', false);
        expectMatch('Maximum CPU threshold per service', 'CPU threshold', true);
      });

      it('CPU*threshold is a different query than CPU threshold', () => {
        expect(buildTemplateSearchWildcardValue('CPU*threshold')).toBe('*CPU*threshold*');
        expectMatch('CPU average combined with latency threshold', 'CPU*threshold', true);
        expectMatch('Maximum CPU threshold per service', 'CPU*threshold', true);
        expectMatch('CPU average combined with latency threshold', 'CPU threshold', false);
      });

      it('wrapping quotes are not phrase syntax, they are stripped', () => {
        expect(buildTemplateSearchWildcardValue('"CPU threshold"')).toBe('*CPU threshold*');
        expectMatch('Maximum CPU threshold per service', '"CPU threshold"', true);
        expectMatch('CPU average combined with latency threshold', '"CPU threshold"', false);
      });
    });

    describe('injection / wildcard safety', () => {
      it('keeps * as a wildcard operator', () => {
        expect(buildTemplateSearchWildcardValue('kub*')).toBe('*kub**');
        expect(buildTemplateSearchWildcardValue('*kub*')).toBe('**kub**');
      });

      it('escapes ? so a typed question mark is literal', () => {
        expect(buildTemplateSearchWildcardValue('foo?')).toBe('*foo\\?*');
        expectMatch('foo?', 'foo?', true);
        expectMatch('food', 'foo?', false);
      });

      it('escapes \\ so it cannot neutralize the wrapping *', () => {
        expect(buildTemplateSearchWildcardValue('foo\\')).toBe('*foo\\\\*');
        expectMatch('foo*', 'foo\\', false);
        expectMatch('foobar', 'foo\\', false);
        expectMatch('foo\\bar', 'foo\\', true);
      });
    });
  });

  describe('toSavedObjectEsQuery', () => {
    it('rewrites type.attributes.field to the ES field path', () => {
      const node = nodeBuilder.is('alerting_rule_template.attributes.engine', 'v1');
      expect(toSavedObjectEsQuery(node)).toEqual({
        bool: {
          minimum_should_match: 1,
          should: [{ match: { 'alerting_rule_template.engine': 'v1' } }],
        },
      });
    });
  });

  describe('buildConsumersFilter', () => {
    it('returns undefined if ruleTypeIds is undefined', () => {
      expect(buildConsumersFilter()).toBeUndefined();
    });

    it('returns undefined if ruleTypeIds is is an empty array', () => {
      expect(buildConsumersFilter([])).toBeUndefined();
    });

    it('builds the filter correctly', () => {
      expect(buildConsumersFilter(['foo', 'bar'])).toMatchInlineSnapshot(`
        Object {
          "arguments": Array [
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "alert.attributes.consumer",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "foo",
                },
              ],
              "function": "is",
              "type": "function",
            },
            Object {
              "arguments": Array [
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "alert.attributes.consumer",
                },
                Object {
                  "isQuoted": false,
                  "type": "literal",
                  "value": "bar",
                },
              ],
              "function": "is",
              "type": "function",
            },
          ],
          "function": "or",
          "type": "function",
        }
      `);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { generateRulesFromRaw, ExceptFieldRule, AnyRule, FieldRule } from '.';
import { RoleMapping } from '../../../../../common/model';
import { AllRule } from './all_rule';
import { RuleBuilderError } from './rule_builder';

describe('generateRulesFromRaw', () => {
  it('returns null for an empty rule set', () => {
    expect(generateRulesFromRaw({})).toEqual({
      rules: null,
      maxDepth: 0,
    });
  });

  it('returns a correctly parsed rule set', () => {
    const rawRules: RoleMapping['rules'] = {
      all: [
        {
          except: {
            field: { username: '*' },
          },
        },
        {
          any: [
            {
              field: { dn: '*' },
            },
          ],
        },
      ],
    };

    const { rules, maxDepth } = generateRulesFromRaw(rawRules);

    expect(rules).toBeInstanceOf(AllRule);
    expect(maxDepth).toEqual(3);

    const subRules = (rules as AllRule).getRules();
    expect(subRules).toHaveLength(2);
    expect(subRules[0]).toBeInstanceOf(ExceptFieldRule);
    expect((subRules[0] as ExceptFieldRule).getRules()).toHaveLength(1);

    expect(subRules[1]).toBeInstanceOf(AnyRule);
    expect((subRules[1] as AnyRule).getRules()).toHaveLength(1);
  });

  it('does not support multiple rules at the root level', () => {
    expect(() => {
      generateRulesFromRaw({
        all: [
          {
            field: { username: '*' },
          },
        ],
        any: [
          {
            field: { username: '*' },
          },
        ],
      });
    }).toThrowError('Expected a single rule definition, but found 2.');
  });

  it('provides a rule trace describing the location of the error', () => {
    try {
      generateRulesFromRaw({
        all: [
          {
            field: { username: '*' },
          },
          {
            any: [
              {
                field: { username: '*' },
              },
              {
                except: { field: { username: '*' } },
              },
            ],
          },
        ],
      });
      throw new Error(`Expected generateRulesFromRaw to throw error.`);
    } catch (e) {
      if (e instanceof RuleBuilderError) {
        expect(e.message).toEqual(`"except" rule can only exist within an "all" rule.`);
        expect(e.ruleTrace).toEqual(['all', '[1]', 'any', '[1]', 'except']);
      } else {
        throw e;
      }
    }
  });

  it('calculates the max depth of the rule tree', () => {
    const rules = {
      all: [
        // depth = 1
        {
          // depth = 2
          all: [
            // depth = 3
            {
              any: [
                // depth == 4
                { field: { username: 'foo' } },
              ],
            },
            { except: { field: { username: 'foo' } } },
          ],
        },
        {
          // depth = 2
          any: [
            {
              // depth = 3
              all: [
                {
                  // depth = 4
                  any: [
                    {
                      // depth = 5
                      all: [
                        {
                          // depth = 6
                          all: [
                            // depth = 7
                            {
                              except: {
                                field: { username: 'foo' },
                              },
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(generateRulesFromRaw(rules).maxDepth).toEqual(7);
  });

  describe('"any"', () => {
    it('expects an array value', () => {
      expect(() => {
        generateRulesFromRaw({
          any: {
            field: { username: '*' },
          } as any,
        });
      }).toThrowError('Expected an array of rules, but found object.');
    });
  });

  describe('"all"', () => {
    it('expects an array value', () => {
      expect(() => {
        generateRulesFromRaw({
          all: {
            field: { username: '*' },
          } as any,
        });
      }).toThrowError('Expected an array of rules, but found object.');
    });
  });

  describe('"field"', () => {
    it(`expects an object value`, () => {
      expect(() => {
        generateRulesFromRaw({
          field: [
            {
              username: '*',
            },
          ],
        });
      }).toThrowError('Expected an object, but found array.');
    });

    it(`expects an single property in its object value`, () => {
      expect(() => {
        generateRulesFromRaw({
          field: {
            username: '*',
            dn: '*',
          },
        });
      }).toThrowError('Expected a single field, but found 2.');
    });

    it('accepts an array of possible values', () => {
      const { rules } = generateRulesFromRaw({
        field: {
          username: [0, '*', null, 'foo'],
        },
      });

      expect(rules).toBeInstanceOf(FieldRule);
      expect((rules as FieldRule).field).toEqual('username');
      expect((rules as FieldRule).value).toEqual([0, '*', null, 'foo']);
    });

    [true, false, undefined, [true, false, undefined]].forEach(invalidValue => {
      it(`does not support a value of ${invalidValue}`, () => {
        expect(() => {
          generateRulesFromRaw({
            field: {
              username: invalidValue,
            },
          });
        }).toThrowErrorMatchingSnapshot();
      });
    });
  });

  describe('"except"', () => {
    it(`"except" can only be nested inside an "all" clause`, () => {
      expect(() => {
        generateRulesFromRaw({
          any: [
            {
              except: {
                field: {
                  username: '*',
                },
              },
            },
          ],
        });
      }).toThrowError(`"except" rule can only exist within an "all" rule.`);

      expect(() => {
        generateRulesFromRaw({
          except: {
            field: {
              username: '*',
            },
          },
        });
      }).toThrowError(`"except" rule can only exist within an "all" rule.`);
    });
  });
});

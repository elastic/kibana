/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  buildQueryExceptions,
  buildExceptions,
  operatorBuilder,
  buildExists,
  buildMatch,
  buildMatchAll,
  evaluateValues,
} from './build_exceptions_query';
import { List } from '../routes/schemas/types/lists_default_array';

describe('build_exceptions_query', () => {
  describe('operatorBuilder', () => {
    test('it returns "not " when operator is "excluded"', () => {
      const operator = operatorBuilder('excluded');

      expect(operator).toEqual('not ');
    });

    test('it returns empty string when operator is "included"', () => {
      const operator = operatorBuilder('included');

      expect(operator).toEqual('');
    });
  });

  describe('buildExists', () => {
    test('it returns formatted wildcard string when operator is "excluded"', () => {
      const query = buildExists('excluded', 'host.name');

      expect(query).toEqual('not host.name: *');
    });

    test('it returns formatted wildcard string when operator is "included"', () => {
      const query = buildExists('included', 'host.name');

      expect(query).toEqual('host.name: *');
    });
  });

  describe('buildMatch', () => {
    test('it returns formatted string when operator is "included"', () => {
      const values = [
        {
          name: 'suricata',
        },
      ];
      const query = buildMatch('included', 'host.name', values);

      expect(query).toEqual('host.name: suricata');
    });

    test('it returns formatted string when operator is "excluded"', () => {
      const values = [
        {
          name: 'suricata',
        },
      ];
      const query = buildMatch('excluded', 'host.name', values);

      expect(query).toEqual('not host.name: suricata');
    });

    // TODO: need to clean up types and maybe restrict values to one if type is 'match'
    test('it returns formatted string when "values" includes more than one item', () => {
      const values = [
        {
          name: 'suricata',
        },
        {
          name: 'auditd',
        },
      ];
      const query = buildMatch('included', 'host.name', values);

      expect(query).toEqual('host.name: suricata');
    });
  });

  describe('buildMatchAll', () => {
    test('it returns formatted string when operator is "included"', () => {
      const values = [
        {
          name: 'suricata',
        },
        {
          name: 'auditd',
        },
      ];
      const query = buildMatchAll('included', 'host.name', values);

      expect(query).toEqual('host.name: (suricata or auditd)');
    });

    test('it returns formatted string when operator is "excluded"', () => {
      const values = [
        {
          name: 'suricata',
        },
        {
          name: 'auditd',
        },
      ];
      const query = buildMatchAll('excluded', 'host.name', values);

      expect(query).toEqual('not host.name: (suricata or auditd)');
    });

    test('it returns formatted string when "values" includes only one item', () => {
      const values = [
        {
          name: 'suricata',
        },
      ];
      const query = buildMatchAll('included', 'host.name', values);

      expect(query).toEqual('host.name: suricata');
    });
  });

  describe('evaluateValues', () => {
    test('it returns formatted wildcard string when "type" is "exists"', () => {
      const result = evaluateValues('included', 'exists', 'host.name');

      expect(result).toEqual('host.name: *');
    });

    test('it returns formatted string when "type" is "match"', () => {
      const result = evaluateValues('included', 'match', 'host.name', [{ name: 'suricata' }]);

      expect(result).toEqual('host.name: suricata');
    });

    test('it returns formatted string when "type" is "match_all"', () => {
      const values = [
        {
          name: 'suricata',
        },
        {
          name: 'auditd',
        },
      ];
      const result = evaluateValues('included', 'match_all', 'host.name', values);

      expect(result).toEqual('host.name: (suricata or auditd)');
    });
  });

  describe('buildExceptions', () => {
    test('it returns string array with as many items as lists', () => {
      const lists: List[] = [
        {
          field: 'event.module',
          values_operator: 'included',
          values_type: 'match_all',
          values: [
            {
              name: 'suricata',
            },
            {
              name: 'auditd',
            },
          ],
          and: [
            {
              field: 'source.ip',
              values_operator: 'excluded',
              values_type: 'match',
              values: [
                {
                  name: '34.66.418',
                },
              ],
            },
          ],
        },
        {
          field: 'event.action',
          values_operator: 'excluded',
          values_type: 'match_all',
          values: [
            {
              name: 'bound-socket',
            },
            {
              name: 'network_flow',
            },
          ],
        },
      ];
      const query = buildExceptions(lists);
      const expectedQuery = [
        '(event.module: (suricata or auditd) and not source.ip: 34.66.418)',
        '(not event.action: (bound-socket or network_flow))',
      ];

      expect(query.length).toEqual(2);
      expect(query).toEqual(expectedQuery);
    });

    test('it returns single value without parens when only one list item', () => {
      const lists: List[] = [
        {
          field: 'event.module',
          values_operator: 'included',
          values_type: 'match_all',
          values: [
            {
              name: 'suricata',
            },
            {
              name: 'auditd',
            },
          ],
          and: [
            {
              field: 'source.ip',
              values_operator: 'excluded',
              values_type: 'match',
              values: [
                {
                  name: '34.66.418',
                },
              ],
            },
          ],
        },
      ];
      const query = buildExceptions(lists);
      const expectedQuery = ['event.module: (suricata or auditd) and not source.ip: 34.66.418'];

      expect(query).toEqual(expectedQuery);
    });

    test('it should separate logic using "and" when listItem.and exists', () => {
      const lists: List[] = [
        {
          field: 'event.module',
          values_operator: 'included',
          values_type: 'match_all',
          values: [
            {
              name: 'suricata',
            },
            {
              name: 'auditd',
            },
          ],
          and: [
            {
              field: 'source.ip',
              values_operator: 'included',
              values_type: 'match',
              values: [
                {
                  name: '34.66.418',
                },
              ],
            },
          ],
        },
      ];
      const query = buildExceptions(lists);
      const expectedQuery = ['event.module: (suricata or auditd) and source.ip: 34.66.418'];

      expect(query).toEqual(expectedQuery);
    });
  });

  describe('buildQueryExceptions', () => {
    test('it returns orginal query if no lists exist', () => {
      // create signals when host name exists
      const query = buildQueryExceptions('host.name: *', 'kuery', []);
      const expectedQuery = 'host.name: *';

      expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
    });

    test('it returns expected query when lists exists', () => {
      // create signals when host.name exists, and when event.module is not suricata or auditd and source.ip is 34.66.418
      // OR when event.action is bound-socket or network_flow
      const lists: List[] = [
        {
          field: 'event.module',
          values_operator: 'included',
          values_type: 'match_all',
          values: [
            {
              name: 'suricata',
            },
            {
              name: 'auditd',
            },
          ],
          and: [
            {
              field: 'source.ip',
              values_operator: 'excluded',
              values_type: 'match',
              values: [
                {
                  name: '34.66.418',
                },
              ],
            },
          ],
        },
        {
          field: 'event.action',
          values_operator: 'excluded',
          values_type: 'match_all',
          values: [
            {
              name: 'bound-socket',
            },
            {
              name: 'network_flow',
            },
          ],
        },
      ];
      const query = buildQueryExceptions('host.name: *', 'kuery', lists);
      const expectedQuery =
        'host.name: * and not ((event.module: (suricata or auditd) and not source.ip: 34.66.418) or (not event.action: (bound-socket or network_flow)))';

      expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
    });

    describe('values_operator is included', () => {
      test('it returns expected query when values_type is exists', () => {
        // don't create signals when event.module exists
        const lists: List[] = [
          {
            field: 'event.module',
            values_operator: 'included',
            values_type: 'exists',
          },
        ];
        const query = buildQueryExceptions('host.name: *', 'kuery', lists);
        const expectedQuery = 'host.name: * and not (event.module: *)';

        expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
      });

      test('it returns expected query when values_type is match', () => {
        // don't create signals when event.module is suricata
        const lists: List[] = [
          {
            field: 'event.module',
            values_operator: 'included',
            values_type: 'match',
            values: [
              {
                name: 'suricata',
              },
            ],
          },
        ];
        const query = buildQueryExceptions('host.name: *', 'kuery', lists);
        const expectedQuery = 'host.name: * and not (event.module: suricata)';

        expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
      });

      test('it returns expected query when values_type is match_all', () => {
        // don't create signals when event.module is suricata or auditd
        const lists: List[] = [
          {
            field: 'event.module',
            values_operator: 'included',
            values_type: 'match_all',
            values: [
              {
                name: 'suricata',
              },
              {
                name: 'auditd',
              },
            ],
          },
        ];
        const query = buildQueryExceptions('host.name: *', 'kuery', lists);
        const expectedQuery = 'host.name: * and not (event.module: (suricata or auditd))';

        expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
      });
    });

    describe('values_operator is excluded', () => {
      test('it returns expected query when values_type is exists', () => {
        // don't create signals when event.module does not exist
        const lists: List[] = [
          {
            field: 'event.module',
            values_operator: 'excluded',
            values_type: 'exists',
          },
        ];
        const query = buildQueryExceptions('host.name: *', 'kuery', lists);
        const expectedQuery = 'host.name: * and not (not event.module: *)';

        expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
      });

      test('it returns expected query when values_type is match', () => {
        // don't create signals when event.module is not suricata
        const lists: List[] = [
          {
            field: 'event.module',
            values_operator: 'excluded',
            values_type: 'match',
            values: [
              {
                name: 'suricata',
              },
            ],
          },
        ];
        const query = buildQueryExceptions('host.name: *', 'kuery', lists);
        const expectedQuery = 'host.name: * and not (not event.module: suricata)';

        expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
      });

      test('it returns expected query when values_type is match_all', () => {
        // don't create signals when event.module is not suricata or auditd
        const lists: List[] = [
          {
            field: 'event.module',
            values_operator: 'excluded',
            values_type: 'match_all',
            values: [
              {
                name: 'suricata',
              },
              {
                name: 'auditd',
              },
            ],
          },
        ];
        const query = buildQueryExceptions('host.name: *', 'kuery', lists);
        const expectedQuery = 'host.name: * and not (not event.module: (suricata or auditd))';

        expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
      });
    });

    describe('and', () => {
      test('it returns expected query when and values_operator is excluded', () => {
        // create signals when query matches and event.module is not suricata or auditd and source.ip is 34.66.418
        const lists: List[] = [
          {
            field: 'event.module',
            values_operator: 'included',
            values_type: 'match_all',
            values: [
              {
                name: 'suricata',
              },
              {
                name: 'auditd',
              },
            ],
            and: [
              {
                field: 'source.ip',
                values_operator: 'excluded',
                values_type: 'match',
                values: [
                  {
                    name: '34.66.418',
                  },
                ],
              },
            ],
          },
        ];
        const query = buildQueryExceptions('host.name: *', 'kuery', lists);
        const expectedQuery =
          'host.name: * and not (event.module: (suricata or auditd) and not source.ip: 34.66.418)';

        expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
      });

      test('it returns expected query when and values_operator is included', () => {
        // create signals when query matches and event.module is not suricata or auditd and source.ip is 34.66.418
        const lists: List[] = [
          {
            field: 'event.module',
            values_operator: 'included',
            values_type: 'match_all',
            values: [
              {
                name: 'suricata',
              },
              {
                name: 'auditd',
              },
            ],
            and: [
              {
                field: 'source.ip',
                values_operator: 'included',
                values_type: 'match',
                values: [
                  {
                    name: '34.66.418',
                  },
                ],
              },
            ],
          },
        ];
        const query = buildQueryExceptions('host.name: *', 'kuery', lists);
        const expectedQuery =
          'host.name: * and not (event.module: (suricata or auditd) and source.ip: 34.66.418)';

        expect(query).toEqual([{ query: expectedQuery, language: 'kuery' }]);
      });
    });
  });
});

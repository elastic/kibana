/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLMessage, EditorError } from '@kbn/esql-language';
import { formatQueryWithErrors } from './format_query_with_errors';

describe('formatQueryWithErrors', () => {
  // Helper function to find the position of a substring in the query
  const findPosition = (query: string, searchText: string, occurrence = 1): number => {
    let position = -1;
    for (let i = 0; i < occurrence; i++) {
      position = query.indexOf(searchText, position + 1);
      if (position === -1) break;
    }
    return position;
  };

  // Helper function to create location from query and search text
  const createLocation = (
    query: string,
    searchText: string,
    occurrence = 1
  ): { min: number; max: number } => {
    const min = findPosition(query, searchText, occurrence);
    return {
      min,
      max: min + searchText.length,
    };
  };
  describe('with ESQLMessage errors (location-based)', () => {
    it('should format a single syntax error correctly', () => {
      const formattedQuery = `FROM logs
| WHERE status = 200
| STATS count() BY host`;

      const errors: ESQLMessage[] = [
        {
          type: 'error',
          text: 'Expected identifier but found "="',
          location: createLocation(formattedQuery, '='),
          code: 'syntax_error',
        },
      ];

      const result = formatQueryWithErrors(formattedQuery, errors);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('Expected identifier but found "="');
      expect(result[0]).toContain('2. | WHERE status = 200');
      expect(result[0]).toContain('^');

      expect(result[0]).toMatchInlineSnapshot(`
        "1. FROM logs
        2. | WHERE status = 200
                          ^
        Expected identifier but found \\"=\\"
        3. | STATS count() BY host"
      `);
    });

    it('should format multiple errors across different lines', () => {
      const formattedQuery = `FROM invalid_index
| WHERE invalid_field = 200
| STATS invalid_function() BY host
| SORT invalid_sort_field`;

      const errors: ESQLMessage[] = [
        {
          type: 'error',
          text: 'Unknown index "invalid_index"',
          location: createLocation(formattedQuery, 'invalid_index'),
          code: 'index_not_found',
        },
        {
          type: 'error',
          text: 'Unknown field "invalid_field"',
          location: createLocation(formattedQuery, 'invalid_field'),
          code: 'field_not_found',
        },
        {
          type: 'warning',
          text: 'Function "invalid_function" is deprecated',
          location: createLocation(formattedQuery, 'invalid_function'),
          code: 'deprecated_function',
        },
      ];

      const result = formatQueryWithErrors(formattedQuery, errors);

      expect(result).toHaveLength(3);

      expect(result[0]).toContain('Unknown index "invalid_index"');
      expect(result[0]).toContain('1. FROM invalid_index');

      expect(result[1]).toContain('Unknown field "invalid_field"');
      expect(result[1]).toContain('2. | WHERE invalid_field = 200');

      expect(result[2]).toContain('Function "invalid_function" is deprecated');
      expect(result[2]).toContain('3. | STATS invalid_function() BY host');

      expect(result[0]).toMatchInlineSnapshot(`
        "1. FROM invalid_index
                ^^^^^^^^^^^^^
        Unknown index \\"invalid_index\\"
        2. | WHERE invalid_field = 200
        3. | STATS invalid_function() BY host
        4. | SORT invalid_sort_field"
      `);

      expect(result[1]).toMatchInlineSnapshot(`
        "1. FROM invalid_index
        2. | WHERE invalid_field = 200
                   ^^^^^^^^^^^^^
        Unknown field \\"invalid_field\\"
        3. | STATS invalid_function() BY host
        4. | SORT invalid_sort_field"
      `);

      expect(result[2]).toMatchInlineSnapshot(`
        "1. FROM invalid_index
        2. | WHERE invalid_field = 200
        3. | STATS invalid_function() BY host
                   ^^^^^^^^^^^^^^^^
        Function \\"invalid_function\\" is deprecated
        4. | SORT invalid_sort_field"
      `);
    });

    it('should handle errors spanning multiple lines', () => {
      const formattedQuery = `FROM logs
| WHERE host IN (
    "server1",
    "server2"
)
| STATS count() BY host`;

      const errors: ESQLMessage[] = [
        {
          type: 'error',
          text: 'Invalid IN clause syntax',
          location: {
            min: findPosition(formattedQuery, 'host IN ('),
            max: findPosition(formattedQuery, ')') + 1,
          },
          code: 'syntax_error',
        },
      ];

      const result = formatQueryWithErrors(formattedQuery, errors);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('Invalid IN clause syntax');
      expect(result[0]).toContain('2. | WHERE host IN (');
      expect(result[0]).toContain('3.     "server1",');
      expect(result[0]).toContain('4.     "server2"');
      expect(result[0]).toContain('5. )');

      expect(result[0]).toMatchInlineSnapshot(`
        "1. FROM logs
        2. | WHERE host IN (
                   ^^^^^^^^^
        3.     \\"server1\\",
           ^^^^^^^^^^^^^^
        4.     \\"server2\\"
           ^^^^^^^^^^^^^
        5. )
           ^
        Invalid IN clause syntax
        6. | STATS count() BY host"
      `);
    });

    it('should handle complex ES|QL query with aggregation errors', () => {
      const formattedQuery = `FROM kibana_sample_data_logs
| EVAL response_size = case(
    status >= 200 AND status < 300, "small",
    status >= 300 AND status < 400, "medium",
    "large"
)
| STATS 
    avg_response_time = avg(response_time),
    total_requests = count(),
    max_bytes = max(bytes)
  BY response_size, host.keyword
| WHERE total_requests > 100
| SORT avg_response_time DESC`;

      const errors: ESQLMessage[] = [
        {
          type: 'error',
          text: 'Field "response_time" does not exist',
          location: createLocation(formattedQuery, 'response_time', 2),
          code: 'field_not_found',
        },
        {
          type: 'warning',
          text: 'Using deprecated field syntax "host.keyword", consider using "host"',
          location: createLocation(formattedQuery, 'host.keyword'),
          code: 'deprecated_field_syntax',
        },
      ];

      const result = formatQueryWithErrors(formattedQuery, errors);

      expect(result).toHaveLength(2);

      expect(result[0]).toContain('Field "response_time" does not exist');
      expect(result[0]).toContain('8.     avg_response_time = avg(response_time),');

      expect(result[1]).toContain('Using deprecated field syntax "host.keyword"');
      expect(result[1]).toContain('11.   BY response_size, host.keyword');

      expect(result[0]).toMatchInlineSnapshot(`
        "1. FROM kibana_sample_data_logs
        2. | EVAL response_size = case(
        3.     status >= 200 AND status < 300, \\"small\\",
        4.     status >= 300 AND status < 400, \\"medium\\",
        5.     \\"large\\"
        6. )
        7. | STATS 
        8.     avg_response_time = avg(response_time),
                                       ^^^^^^^^^^^^^
        Field \\"response_time\\" does not exist
        9.     total_requests = count(),
        10.     max_bytes = max(bytes)
        11.   BY response_size, host.keyword
        12. | WHERE total_requests > 100
        13. | SORT avg_response_time DESC"
      `);

      expect(result[1]).toMatchInlineSnapshot(`
        "1. FROM kibana_sample_data_logs
        2. | EVAL response_size = case(
        3.     status >= 200 AND status < 300, \\"small\\",
        4.     status >= 300 AND status < 400, \\"medium\\",
        5.     \\"large\\"
        6. )
        7. | STATS 
        8.     avg_response_time = avg(response_time),
        9.     total_requests = count(),
        10.     max_bytes = max(bytes)
        11.   BY response_size, host.keyword
                                ^^^^^^^^^^^^
        Using deprecated field syntax \\"host.keyword\\", consider using \\"host\\"
        12. | WHERE total_requests > 100
        13. | SORT avg_response_time DESC"
      `);
    });
  });

  describe('with EditorError errors (line/column based)', () => {
    it('should format editor errors with existing line/column information', () => {
      const formattedQuery = `FROM logs
| WHERE timestamp > now()
| STATS count() BY @timestamp`;

      const errors: EditorError[] = [
        {
          startLineNumber: 2,
          endLineNumber: 2,
          startColumn: 19,
          endColumn: 24,
          message: 'Function "now()" requires parentheses',
          code: 'syntax_error',
          severity: 'error',
        },
        {
          startLineNumber: 3,
          endLineNumber: 3,
          startColumn: 18,
          endColumn: 28,
          message: 'Field "@timestamp" should be "timestamp"',
          code: 'field_suggestion',
          severity: 'warning',
        },
      ];

      const result = formatQueryWithErrors(formattedQuery, errors);

      expect(result).toHaveLength(2);

      expect(result[0]).toContain('Function "now()" requires parentheses');
      expect(result[0]).toContain('2. | WHERE timestamp > now()');

      expect(result[1]).toContain('Field "@timestamp" should be "timestamp"');
      expect(result[1]).toContain('3. | STATS count() BY @timestamp');
    });

    it('should handle multi-line editor errors', () => {
      const formattedQuery = `FROM logs
| EVAL complex_calc = 
    CASE(
      status = 200, "success",
      status = 404, "not_found",
      "other"
    )
| STATS count() BY complex_calc`;

      const errors: EditorError[] = [
        {
          startLineNumber: 2,
          endLineNumber: 7,
          startColumn: 21,
          endColumn: 5,
          message: 'CASE statement syntax is invalid',
          code: 'case_syntax_error',
          severity: 'error',
        },
      ];

      const result = formatQueryWithErrors(formattedQuery, errors);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('CASE statement syntax is invalid');
      expect(result[0]).toContain('2. | EVAL complex_calc =');
      expect(result[0]).toContain('3.     CASE(');
      expect(result[0]).toContain('4.       status = 200, "success",');
      expect(result[0]).toContain('5.       status = 404, "not_found",');
      expect(result[0]).toContain('6.       "other"');
      expect(result[0]).toContain('7.     )');
    });
  });

  describe('with mixed error types', () => {
    it('should handle both ESQLMessage and EditorError in the same array', () => {
      const formattedQuery = `FROM apache_logs
| WHERE status_code = 500
| EVAL error_type = "server_error"
| STATS error_count = count() BY error_type`;

      const errors: (ESQLMessage | EditorError)[] = [
        {
          type: 'error',
          text: 'Field "status_code" not found, did you mean "status"?',
          location: createLocation(formattedQuery, 'status_code'),
          code: 'field_not_found',
        } as ESQLMessage,
        {
          startLineNumber: 4,
          endLineNumber: 4,
          startColumn: 9,
          endColumn: 20,
          message: 'Variable name "error_count" shadows existing function',
          code: 'variable_shadow_warning',
          severity: 'warning',
        } as EditorError,
      ];

      const result = formatQueryWithErrors(formattedQuery, errors);

      expect(result).toHaveLength(2);

      expect(result[0]).toContain('Field "status_code" not found');
      expect(result[0]).toContain('2. | WHERE status_code = 500');

      expect(result[1]).toContain('Variable name "error_count" shadows existing function');
      expect(result[1]).toContain('4. | STATS error_count = count() BY error_type');
    });
  });

  describe('edge cases', () => {
    it('should handle errors with invalid location ranges gracefully', () => {
      const formattedQuery = `FROM logs | STATS count()`;

      const errors: ESQLMessage[] = [
        {
          type: 'error',
          text: 'Invalid location error',
          location: {
            min: 1000, // Invalid position beyond query length
            max: 1010,
          },
          code: 'invalid_location',
        },
      ];

      const result = formatQueryWithErrors(formattedQuery, errors);

      expect(result).toHaveLength(0); // Should filter out errors with invalid locations
    });

    it('should handle single line query with multiple errors', () => {
      const formattedQuery =
        'FROM invalid_index | WHERE bad_field = unknown_value | STATS bad_func()';

      const errors: ESQLMessage[] = [
        {
          type: 'error',
          text: 'Unknown index',
          location: createLocation(formattedQuery, 'invalid_index'),
          code: 'index_error',
        },
        {
          type: 'error',
          text: 'Unknown field',
          location: createLocation(formattedQuery, 'bad_field'),
          code: 'field_error',
        },
        {
          type: 'error',
          text: 'Unknown function',
          location: createLocation(formattedQuery, 'bad_func'),
          code: 'function_error',
        },
      ];

      const result = formatQueryWithErrors(formattedQuery, errors);

      expect(result).toHaveLength(3);
      result.forEach((errorMsg) => {
        expect(errorMsg).toContain(
          '1. FROM invalid_index | WHERE bad_field = unknown_value | STATS bad_func()'
        );
      });
    });

    it('should handle errors at query boundaries', () => {
      const formattedQuery = `FROM logs
| LIMIT 10`;

      const errors: ESQLMessage[] = [
        {
          type: 'error',
          text: 'Error at start',
          location: createLocation(formattedQuery, 'FROM'),
          code: 'start_error',
        },
        {
          type: 'error',
          text: 'Error at end',
          location: createLocation(formattedQuery, '10'),
          code: 'end_error',
        },
      ];

      const result = formatQueryWithErrors(formattedQuery, errors);

      expect(result).toHaveLength(2);
      expect(result[0]).toContain('Error at start');
      expect(result[0]).toContain('1. FROM logs');
      expect(result[1]).toContain('Error at end');
      expect(result[1]).toContain('2. | LIMIT 10');
    });
  });
});

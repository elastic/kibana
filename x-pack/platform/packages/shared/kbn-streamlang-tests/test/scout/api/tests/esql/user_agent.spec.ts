/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { StreamlangDSL, UserAgentProcessor } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to ES|QL - User Agent Processor',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should generate USER_AGENT command with basic configuration', async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'http.user_agent',
            to: 'parsed_agent',
          } as UserAgentProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      // Verify that the ES|QL query contains the USER_AGENT command
      expect(query).toContain('USER_AGENT');
      expect(query).toContain('parsed_agent');
      expect(query).toContain('`http.user_agent`');
    });

    apiTest('should generate USER_AGENT command with default target field', async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'agent_string',
          } as UserAgentProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      // Default target field should be 'user_agent'
      expect(query).toContain('USER_AGENT');
      expect(query).toContain('user_agent');
      expect(query).toContain('agent_string');
    });

    apiTest('should generate USER_AGENT command with regex_file option', async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'agent_string',
            to: 'parsed_agent',
            regex_file: 'myregexes.yaml',
          } as UserAgentProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      // Should contain WITH clause with regex_file option
      expect(query).toContain('USER_AGENT');
      expect(query).toContain('WITH');
      expect(query).toContain('regex_file');
      expect(query).toContain('myregexes.yaml');
    });

    apiTest('should generate USER_AGENT command with extract_device_type option', async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'agent_string',
            to: 'parsed_agent',
            extract_device_type: true,
          } as UserAgentProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      // Should contain WITH clause with extract_device_type option
      expect(query).toContain('USER_AGENT');
      expect(query).toContain('WITH');
      expect(query).toContain('extract_device_type');
      expect(query).toContain('true');
    });

    apiTest('should generate USER_AGENT command with properties option', async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'agent_string',
            to: 'parsed_agent',
            properties: ['name', 'os', 'version'],
          } as UserAgentProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      // Should contain WITH clause with properties option as a list
      expect(query).toContain('USER_AGENT');
      expect(query).toContain('WITH');
      expect(query).toContain('properties');
      expect(query).toContain('name');
      expect(query).toContain('os');
      expect(query).toContain('version');
    });

    apiTest('should generate USER_AGENT command with all options', async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'http.user_agent',
            to: 'parsed_agent',
            regex_file: 'custom.yaml',
            properties: ['name', 'device'],
            extract_device_type: true,
          } as UserAgentProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      // Should contain USER_AGENT command with all options in WITH clause
      expect(query).toContain('USER_AGENT');
      expect(query).toContain('parsed_agent');
      expect(query).toContain('WITH');
      expect(query).toContain('regex_file');
      expect(query).toContain('custom.yaml');
      expect(query).toContain('properties');
      expect(query).toContain('name');
      expect(query).toContain('device');
      expect(query).toContain('extract_device_type');
      expect(query).toContain('true');
    });

    apiTest('should handle ignore_missing with conditional execution', async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'agent_string',
            to: 'parsed_agent',
            ignore_missing: true,
          } as UserAgentProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      // Should generate conditional execution pattern (CASE statement for temporary field)
      expect(query).toContain('USER_AGENT');
      expect(query).toContain('CASE');
      expect(query).toContain('__temp_user_agent_where_agent_string__');
      expect(query).toContain('DROP');
    });

    apiTest('should handle where condition with conditional execution', async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'agent_string',
            to: 'parsed_agent',
            where: { field: 'should_parse', eq: true },
          } as UserAgentProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      // Should generate conditional execution with WHERE condition check
      expect(query).toContain('USER_AGENT');
      expect(query).toContain('CASE');
      expect(query).toContain('should_parse');
    });

    apiTest('should generate valid ES|QL when mixed with supported processors', async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'supported_field',
            value: 'supported_value',
          },
          {
            action: 'user_agent',
            from: 'agent_string',
            to: 'parsed_agent',
          } as UserAgentProcessor,
          {
            action: 'rename',
            from: 'old_field',
            to: 'new_field',
            override: true,
          },
        ],
      };

      const { query } = transpile(streamlangDSL);

      // Should contain USER_AGENT command
      expect(query).toContain('USER_AGENT');

      // Should also contain supported processors
      expect(query).toContain('EVAL'); // For set processor
      expect(query).toContain('RENAME'); // For rename processor
    });

    // Template validation tests - both transpilers should consistently REJECT Mustache templates
    [
      {
        templateType: '{{ }}',
        from: '{{template_from}}',
      },
      {
        templateType: '{{{ }}}',
        from: '{{{template_from}}}',
      },
    ].forEach(({ templateType, from }) => {
      apiTest(`should consistently reject ${templateType} template syntax`, async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'user_agent',
              from,
            } as UserAgentProcessor,
          ],
        };

        // Transpiler should throw validation error for Mustache templates
        expect(() => transpile(streamlangDSL)).toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed'
        );
      });
    });
  }
);

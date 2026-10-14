/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { StreamlangDSL, UserAgentProcessor } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to ES|QL - User Agent Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
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

      const { query } = await transpile(streamlangDSL);

      expect(query).toContain('USER_AGENT');
      expect(query).toContain('__streamlang_user_agent');
      expect(query).toContain('COALESCE');
      expect(query).toContain('parsed_agent');
      expect(query).toContain('`http.user_agent`');
      expect(query).toContain('EVAL');
      expect(query).toContain('`parsed_agent.original`');
      expect(query).toContain('DROP');
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

      const { query } = await transpile(streamlangDSL);

      expect(query).toContain('USER_AGENT');
      expect(query).toContain('user_agent');
      expect(query).toContain('agent_string');
      expect(query).toContain('EVAL');
      expect(query).toContain('`user_agent.original`');
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

      const { query } = await transpile(streamlangDSL);

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

      const { query } = await transpile(streamlangDSL);

      expect(query).toContain('USER_AGENT');
      expect(query).toContain('WITH');
      expect(query).toContain('extract_device_type');
      expect(query).toMatch(/extract_device_type":\s*TRUE/i);
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

      const { query } = await transpile(streamlangDSL);

      expect(query).toContain('USER_AGENT');
      expect(query).toContain('WITH');
      expect(query).toContain('properties');
      expect(query).toContain('name');
      expect(query).toContain('os');
      expect(query).toContain('version');
      expect(query).not.toContain('`parsed_agent.original`');
    });

    apiTest(
      'should omit original from USER_AGENT WITH map but add original via EVAL (ES|QL parity with ingest)',
      async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'user_agent',
              from: 'agent_string',
              to: 'parsed_agent',
              ignore_missing: true,
              properties: ['name', 'original', 'version'],
            } as UserAgentProcessor,
          ],
        };

        const { query } = await transpile(streamlangDSL);

        expect(query).toContain('USER_AGENT');
        expect(query).toContain('properties');
        expect(query).toContain('name');
        expect(query).toContain('version');
        expect(query).not.toMatch(/["']original["']/);
        expect(query).toContain('EVAL');
        expect(query).toContain('`parsed_agent.original`');
      }
    );

    apiTest(
      'should add EVAL for target.original when properties default (ingest parity)',
      async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'user_agent',
              from: 'agent',
              ignore_missing: true,
            } as UserAgentProcessor,
          ],
        };

        const { query } = await transpile(streamlangDSL);

        expect(query).toContain('USER_AGENT');
        expect(query).toContain('EVAL');
        expect(query).toContain('`user_agent.original`');
      }
    );

    apiTest('should not add EVAL for original when properties exclude it', async () => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'user_agent',
            from: 'agent',
            ignore_missing: true,
            properties: ['name', 'version'],
          } as UserAgentProcessor,
        ],
      };

      const { query } = await transpile(streamlangDSL);

      expect(query).toContain('USER_AGENT');
      expect(query).toContain('WITH');
      expect(query).not.toContain('`user_agent.original`');
    });

    apiTest(
      'should gate input with NULL sentinel and COALESCE original when where is set',
      async () => {
        const streamlangDSL: StreamlangDSL = {
          steps: [
            {
              action: 'user_agent',
              from: 'agent',
              to: 'parsed_agent',
              ignore_missing: true,
              where: { field: 'keep', eq: true },
            } as UserAgentProcessor,
          ],
        };

        const { query } = await transpile(streamlangDSL);

        expect(query).toContain('USER_AGENT');
        expect(query).toContain('__streamlang_user_agent_expression');
        expect(query).toContain('CASE');
        expect(query).toContain('keep');
        expect(query).toContain('NULL');
        expect(query).toContain(
          'COALESCE(__streamlang_user_agent_expression, `parsed_agent.original`)'
        );
        expect(query.match(/CASE\(/g) ?? []).toHaveLength(1);
      }
    );

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

      const { query } = await transpile(streamlangDSL);

      expect(query).toContain('USER_AGENT');
      expect(query).toContain('parsed_agent');
      expect(query).toContain('WITH');
      expect(query).toContain('regex_file');
      expect(query).toContain('custom.yaml');
      expect(query).toContain('properties');
      expect(query).toContain('name');
      expect(query).toContain('device');
      expect(query).toContain('extract_device_type');
      expect(query).toMatch(/extract_device_type":\s*TRUE/i);
      expect(query).not.toContain('`parsed_agent.original`');
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

      const { query } = await transpile(streamlangDSL);

      expect(query).toContain('USER_AGENT');
      expect(query).toContain('__streamlang_user_agent_expression');
      expect(query).toContain('CASE');
      expect(query).toContain('should_parse');
      expect(query).toContain('NULL');
      expect(query).toContain('COALESCE');
      expect(query).toContain('`parsed_agent.original`');
      expect(query.match(/CASE\(/g) ?? []).toHaveLength(1);
    });

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

        await expect(transpile(streamlangDSL)).rejects.toThrow(
          'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
        );
      });
    });
  }
);

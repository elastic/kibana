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
    // ES|QL does not currently support a USER_AGENT command.
    // The transpiler emits a warning message instead.

    apiTest('should emit warning for basic configuration', async () => {
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

      // ES|QL does not support USER_AGENT, so a warning is emitted
      expect(query).toContain('WARNING: user_agent processor not supported in ES|QL');
    });

    apiTest('should emit warning regardless of options', async () => {
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

      // All options are ignored since ES|QL doesn't support USER_AGENT
      expect(query).toContain('WARNING: user_agent processor not supported in ES|QL');
    });

    apiTest('should emit warning with ignore_missing', async () => {
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

      expect(query).toContain('WARNING: user_agent processor not supported in ES|QL');
    });

    apiTest('should emit warning with where condition', async () => {
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

      expect(query).toContain('WARNING: user_agent processor not supported in ES|QL');
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

      // Should contain warning for user_agent
      expect(query).toContain('WARNING: user_agent processor not supported in ES|QL');

      // Should also contain supported processors
      expect(query).toContain('EVAL'); // For set processor and warning
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PackageInfo } from '../../../../common/types';

import { hasNewDeprecations, getDeprecationDetails } from './deprecation_helpers';

const createMockPkg = (overrides: Partial<PackageInfo> = {}): PackageInfo =>
  ({
    name: 'test-pkg',
    version: '1.0.0',
    title: 'Test Package',
    description: 'A test package',
    type: 'integration',
    format_version: '1.0.0',
    owner: { github: 'elastic' },
    status: 'installed',
    policy_templates: [],
    data_streams: [],
    vars: [],
    ...overrides,
  } as unknown as PackageInfo);

describe('deprecation_helpers', () => {
  describe('hasNewDeprecations', () => {
    it('returns false when neither package has deprecations', () => {
      const current = createMockPkg();
      const target = createMockPkg({ version: '2.0.0' });

      expect(hasNewDeprecations(current, target)).toBe(false);
    });

    it('returns true when target package has package-level deprecation but current does not', () => {
      const current = createMockPkg();
      const target = createMockPkg({
        version: '2.0.0',
        deprecated: { description: 'This package is deprecated' },
      });

      expect(hasNewDeprecations(current, target)).toBe(true);
    });

    it('returns false when both packages have the same package-level deprecation', () => {
      const deprecation = { description: 'Already deprecated' };
      const current = createMockPkg({ deprecated: deprecation });
      const target = createMockPkg({ version: '2.0.0', deprecated: deprecation });

      expect(hasNewDeprecations(current, target)).toBe(false);
    });

    it('returns true when target has a new deprecated policy template', () => {
      const current = createMockPkg({
        policy_templates: [{ name: 'logs', title: 'Logs', description: 'Collect logs' }],
      });
      const target = createMockPkg({
        version: '2.0.0',
        policy_templates: [
          {
            name: 'logs',
            title: 'Logs',
            description: 'Collect logs',
            deprecated: { description: 'Use new integration' },
          },
        ],
      });

      expect(hasNewDeprecations(current, target)).toBe(true);
    });

    it('returns false when both have the same deprecated policy template', () => {
      const pt = {
        name: 'logs',
        title: 'Logs',
        description: 'Collect logs',
        deprecated: { description: 'Use new integration' },
      };
      const current = createMockPkg({ policy_templates: [pt] });
      const target = createMockPkg({ version: '2.0.0', policy_templates: [pt] });

      expect(hasNewDeprecations(current, target)).toBe(false);
    });

    it('returns true when target has a new deprecated input', () => {
      const current = createMockPkg({
        policy_templates: [
          {
            name: 'logs',
            title: 'Logs',
            description: 'Collect logs',
            inputs: [{ type: 'logfile', title: 'Log file', description: 'Collect from log file' }],
          },
        ],
      });
      const target = createMockPkg({
        version: '2.0.0',
        policy_templates: [
          {
            name: 'logs',
            title: 'Logs',
            description: 'Collect logs',
            inputs: [
              {
                type: 'logfile',
                title: 'Log file',
                description: 'Collect from log file',
                deprecated: { description: 'Use new input' },
              },
            ],
          },
        ],
      });

      expect(hasNewDeprecations(current, target)).toBe(true);
    });

    it('returns true when target has a new deprecated stream', () => {
      const current = createMockPkg({
        data_streams: [
          {
            dataset: 'test.logs',
            type: 'logs',
            title: 'Logs',
            release: 'ga',
            package: 'test-pkg',
            path: 'logs',
            streams: [{ input: 'logfile', title: 'Log stream', template_path: 'stream.yml.hbs' }],
          },
        ],
      });
      const target = createMockPkg({
        version: '2.0.0',
        data_streams: [
          {
            dataset: 'test.logs',
            type: 'logs',
            title: 'Logs',
            release: 'ga',
            package: 'test-pkg',
            path: 'logs',
            streams: [
              {
                input: 'logfile',
                title: 'Log stream',
                template_path: 'stream.yml.hbs',
                deprecated: { description: 'Use new stream' },
              },
            ],
          },
        ],
      });

      expect(hasNewDeprecations(current, target)).toBe(true);
    });

    it('returns true when target has a new deprecated variable', () => {
      const current = createMockPkg({
        vars: [{ name: 'api_key', type: 'string', title: 'API Key' }],
      });
      const target = createMockPkg({
        version: '2.0.0',
        vars: [
          {
            name: 'api_key',
            type: 'string',
            title: 'API Key',
            deprecated: { description: 'Use OAuth instead' },
          },
        ],
      });

      expect(hasNewDeprecations(current, target)).toBe(true);
    });
  });

  describe('getDeprecationDetails', () => {
    it('returns undefined when no deprecations exist', () => {
      const pkg = createMockPkg();
      expect(getDeprecationDetails(pkg)).toBeUndefined();
    });

    it('returns package-level deprecation first', () => {
      const pkg = createMockPkg({
        deprecated: { description: 'Entire package is deprecated' },
        policy_templates: [
          {
            name: 'logs',
            title: 'Logs',
            description: 'Collect logs',
            deprecated: { description: 'Template deprecated' },
          },
        ],
      });

      expect(getDeprecationDetails(pkg)).toEqual({
        description: 'Entire package is deprecated',
      });
    });

    it('returns policy template deprecation when no package-level deprecation', () => {
      const pkg = createMockPkg({
        policy_templates: [
          {
            name: 'logs',
            title: 'Logs',
            description: 'Collect logs',
            deprecated: { description: 'Template deprecated' },
          },
        ],
      });

      expect(getDeprecationDetails(pkg)).toEqual({
        description: 'Template deprecated',
      });
    });

    it('returns input deprecation when no higher-level deprecation', () => {
      const pkg = createMockPkg({
        policy_templates: [
          {
            name: 'logs',
            title: 'Logs',
            description: 'Collect logs',
            inputs: [
              {
                type: 'logfile',
                title: 'Log file',
                description: 'Collect from log file',
                deprecated: { description: 'Input deprecated' },
              },
            ],
          },
        ],
      });

      expect(getDeprecationDetails(pkg)).toEqual({
        description: 'Input deprecated',
      });
    });
  });
});

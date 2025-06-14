/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load } from 'js-yaml';

import {
  getAllowedOutputTypesForAgentPolicy,
  outputYmlIncludesReservedPerformanceKey,
} from './output_helpers';

describe('getAllowedOutputTypesForAgentPolicy', () => {
  it('should return all available output type for an agent policy without APM and Fleet Server', () => {
    const res = getAllowedOutputTypesForAgentPolicy({
      package_policies: [
        {
          package: { name: 'nginx' },
        },
      ],
    } as any);

    expect(res).toHaveLength(4);
    expect(res).toContain('elasticsearch');
    expect(res).toContain('logstash');
    expect(res).toContain('kafka');
    expect(res).toContain('remote_elasticsearch');
  });

  it('should return only elasticsearch for an agent policy with APM', () => {
    const res = getAllowedOutputTypesForAgentPolicy({
      package_policies: [
        {
          package: { name: 'apm' },
        },
      ],
    } as any);

    expect(res).toEqual(['elasticsearch']);
  });

  it('should return only elasticsearch for an agent policy with Fleet Server', () => {
    const res = getAllowedOutputTypesForAgentPolicy({
      package_policies: [
        {
          package: { name: 'fleet_server' },
        },
      ],
    } as any);

    expect(res).toEqual(['elasticsearch']);
  });

  it('should return only elasticsearch for an agent policy with Fleet Server not yet installed', () => {
    const res = getAllowedOutputTypesForAgentPolicy({
      has_fleet_server: true,
    } as any);

    expect(res).toEqual(['elasticsearch']);
  });

  it('should return only elasticsearch for an agentless agent policy', () => {
    const res = getAllowedOutputTypesForAgentPolicy({ supports_agentless: true } as any);

    expect(res).toEqual(['elasticsearch']);
  });
});

describe('getAllowedOutputTypesForPackagePolicy', () => {
  it('should return all available output type for a package policy without agentless support', () => {
    const res = getAllowedOutputTypesForAgentPolicy({
      package_policies: [
        {
          package: { name: 'nginx' },
        },
      ],
    } as any);

    expect(res).toHaveLength(4);
  });

  it('should return only elasticsearch for a package policy with agentless support', () => {
    const res = getAllowedOutputTypesForAgentPolicy({ supports_agentless: true } as any);

    expect(res).toEqual(['elasticsearch']);
  });
});

describe('outputYmlIncludesReservedPerformanceKey', () => {
  describe('dot notation', () => {
    it('returns true when reserved key is present', () => {
      const configYml = `queue.mem.events: 1000`;

      expect(outputYmlIncludesReservedPerformanceKey(configYml, load)).toBe(true);
    });

    it('returns false when no reserved key is present', () => {
      const configYml = `some.random.key: 1000`;

      expect(outputYmlIncludesReservedPerformanceKey(configYml, load)).toBe(false);
    });
  });

  describe('object notation', () => {
    it('returns true when reserved key is present', () => {
      const configYml = `
      queue:
          mem:
            events: 1000
    `;

      expect(outputYmlIncludesReservedPerformanceKey(configYml, load)).toBe(true);
    });

    it('returns false when no reserved key is present', () => {
      const configYml = `
        some:
          random:
            key: 1000
      `;

      expect(outputYmlIncludesReservedPerformanceKey(configYml, load)).toBe(false);
    });
  });

  describe('plain string', () => {
    it('returns true when reserved key is present', () => {
      const configYml = `bulk_max_size`;

      expect(outputYmlIncludesReservedPerformanceKey(configYml, load)).toBe(true);
    });

    it('returns false when no reserved key is present', () => {
      const configYml = `just a string`;

      expect(outputYmlIncludesReservedPerformanceKey(configYml, load)).toBe(false);
    });
  });

  describe('comment', () => {
    it('returns false when reserved key is present only in a comment', () => {
      const configYml = `true`;

      expect(outputYmlIncludesReservedPerformanceKey(configYml, load)).toBe(false);
    });
  });

  describe('empty string', () => {
    it('returns false when YML is empty', () => {
      const configYml = ``;

      expect(outputYmlIncludesReservedPerformanceKey(configYml, load)).toBe(false);
    });
  });
});

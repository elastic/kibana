/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { load } from 'js-yaml';

import { OTEL_COLLECTOR_INPUT_TYPE } from '../constants';
import { outputType, OUTPUT_TYPES_WITH_OTEL_EXPORTER_SUPPORT } from '../constants/output';

import {
  getAllowedOutputTypesForAgentPolicy,
  getAllowedOutputTypesForPackagePolicy,
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
    expect(res).toContain(outputType.Elasticsearch);
    expect(res).toContain(outputType.Logstash);
    expect(res).toContain(outputType.Kafka);
    expect(res).toContain(outputType.RemoteElasticsearch);
  });

  it('should return only elasticsearch for an agent policy with APM', () => {
    const res = getAllowedOutputTypesForAgentPolicy({
      package_policies: [
        {
          package: { name: 'apm' },
        },
      ],
    } as any);

    expect(res).toEqual([outputType.Elasticsearch]);
  });

  it('should return only elasticsearch for an agent policy with Fleet Server', () => {
    const res = getAllowedOutputTypesForAgentPolicy({
      package_policies: [
        {
          package: { name: 'fleet_server' },
        },
      ],
    } as any);

    expect(res).toEqual([outputType.Elasticsearch]);
  });

  it('should return only elasticsearch for an agent policy with Fleet Server not yet installed', () => {
    const res = getAllowedOutputTypesForAgentPolicy({
      has_fleet_server: true,
    } as any);

    expect(res).toEqual([outputType.Elasticsearch]);
  });

  it('should return only elasticsearch for an agentless agent policy', () => {
    const res = getAllowedOutputTypesForAgentPolicy({ supports_agentless: true } as any);

    expect(res).toEqual([outputType.Elasticsearch]);
  });

  it('should return only OTel-supported output types when any package policy has an enabled OTel input', () => {
    const res = getAllowedOutputTypesForAgentPolicy({
      package_policies: [
        {
          package: { name: 'nginx' },
          inputs: [{ type: 'log', enabled: true }],
        },
        {
          package: { name: 'otel' },
          inputs: [{ type: OTEL_COLLECTOR_INPUT_TYPE, enabled: true }],
        },
      ],
    } as any);

    expect(res).toEqual(OUTPUT_TYPES_WITH_OTEL_EXPORTER_SUPPORT);
  });

  it('should not restrict outputs when OTel input is disabled', () => {
    const res = getAllowedOutputTypesForAgentPolicy({
      package_policies: [
        {
          package: { name: 'otel' },
          inputs: [{ type: OTEL_COLLECTOR_INPUT_TYPE, enabled: false }],
        },
      ],
    } as any);

    expect(res).toHaveLength(4);
    expect(res).toContain(outputType.Logstash);
    expect(res).toContain(outputType.Kafka);
  });

  it('should still return only elasticsearch for fleet server even when an OTel input is also present', () => {
    const res = getAllowedOutputTypesForAgentPolicy({
      package_policies: [
        {
          package: { name: 'fleet_server' },
          inputs: [],
        },
        {
          package: { name: 'otel' },
          inputs: [{ type: OTEL_COLLECTOR_INPUT_TYPE, enabled: true }],
        },
      ],
    } as any);

    expect(res).toEqual([outputType.Elasticsearch]);
  });
});

describe('getAllowedOutputTypesForPackagePolicy', () => {
  it('should return all available output types for a non-agentless policy without OTel inputs', () => {
    const res = getAllowedOutputTypesForPackagePolicy({
      supports_agentless: false,
      inputs: [{ type: 'log', streams: [], enabled: true }],
    } as any);

    expect(res).toHaveLength(4);
    expect(res).toContain(outputType.Elasticsearch);
    expect(res).toContain(outputType.Logstash);
    expect(res).toContain(outputType.Kafka);
    expect(res).toContain(outputType.RemoteElasticsearch);
  });

  it('should return only elasticsearch for a package policy with agentless support', () => {
    const res = getAllowedOutputTypesForPackagePolicy({
      supports_agentless: true,
      inputs: [],
    } as any);

    expect(res).toEqual([outputType.Elasticsearch]);
  });

  it('should return only OTel-supported output types when any input is an OTel input', () => {
    const res = getAllowedOutputTypesForPackagePolicy({
      supports_agentless: false,
      inputs: [{ type: OTEL_COLLECTOR_INPUT_TYPE, streams: [], enabled: true }],
    } as any);

    expect(res).toEqual(OUTPUT_TYPES_WITH_OTEL_EXPORTER_SUPPORT);
  });

  it('should return only OTel-supported output types when mixed inputs contain an OTel input', () => {
    const res = getAllowedOutputTypesForPackagePolicy({
      supports_agentless: false,
      inputs: [
        { type: 'log', streams: [], enabled: true },
        { type: OTEL_COLLECTOR_INPUT_TYPE, streams: [], enabled: true },
      ],
    } as any);

    expect(res).toEqual(OUTPUT_TYPES_WITH_OTEL_EXPORTER_SUPPORT);
  });

  it('should return AGENTLESS_ALLOWED_OUTPUT_TYPES (not OTel list) when agentless even with OTel input', () => {
    const res = getAllowedOutputTypesForPackagePolicy({
      supports_agentless: true,
      inputs: [{ type: OTEL_COLLECTOR_INPUT_TYPE, streams: [], enabled: true }],
    } as any);

    expect(res).toEqual([outputType.Elasticsearch]);
  });

  it('should return all available output types when inputs field is missing (safe default)', () => {
    const res = getAllowedOutputTypesForPackagePolicy({
      supports_agentless: false,
    } as any);

    expect(res).toHaveLength(4);
    expect(res).toContain(outputType.Elasticsearch);
    expect(res).toContain(outputType.Logstash);
    expect(res).toContain(outputType.Kafka);
    expect(res).toContain(outputType.RemoteElasticsearch);
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  OBSERVABLE_TYPE_IPV4,
  OBSERVABLE_TYPE_IPV6,
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_FILE_HASH,
  OBSERVABLE_TYPE_FILE_PATH,
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_AGENT_ID,
  OBSERVABLE_TYPE_EMAIL,
  OBSERVABLE_TYPE_URL,
  OBSERVABLE_TYPE_USER,
  OBSERVABLE_TYPE_PROCESS,
  OBSERVABLE_TYPE_REGISTRY,
  OBSERVABLE_TYPE_SERVICE,
} from '../../../common/constants/observables';
import { EntityExtractionService, getIPType } from './entity_extraction_service';
import type { EcsFieldEntry, ExtractionConfig } from './entity_extraction_service';

const createLogger = () => loggingSystemMock.createLogger();

describe('getIPType', () => {
  it('returns IPV4 for a standard IPv4 address', () => {
    expect(getIPType('192.168.1.1')).toBe('IPV4');
  });

  it('returns IPV6 for an address containing colons', () => {
    expect(getIPType('2001:0db8:85a3::8a2e:0370:7334')).toBe('IPV6');
  });

  it('returns IPV6 for ::1 loopback', () => {
    expect(getIPType('::1')).toBe('IPV6');
  });

  it('returns IPV4 for 127.0.0.1', () => {
    expect(getIPType('127.0.0.1')).toBe('IPV4');
  });
});

describe('EntityExtractionService', () => {
  let service: EntityExtractionService;

  beforeEach(() => {
    service = new EntityExtractionService(createLogger());
  });

  describe('extractFromAlert', () => {
    it('extracts source.ip as IPv4', () => {
      const result = service.extractFromAlert([{ field: 'source.ip', value: ['10.0.0.1'] }]);
      expect(result).toEqual([
        {
          typeKey: OBSERVABLE_TYPE_IPV4.key,
          value: '10.0.0.1',
          description: 'Auto extracted observable',
        },
      ]);
    });

    it('extracts destination.ip as IPv6', () => {
      const result = service.extractFromAlert([{ field: 'destination.ip', value: ['fe80::1'] }]);
      expect(result).toEqual([
        {
          typeKey: OBSERVABLE_TYPE_IPV6.key,
          value: 'fe80::1',
          description: 'Auto extracted observable',
        },
      ]);
    });

    it('extracts host.name', () => {
      const result = service.extractFromAlert([{ field: 'host.name', value: ['web-server-01'] }]);
      expect(result).toEqual([
        {
          typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
          value: 'web-server-01',
          description: 'Auto extracted observable',
        },
      ]);
    });

    it('extracts file hash fields', () => {
      const result = service.extractFromAlert([
        { field: 'file.hash.sha256', value: ['abc123'] },
        { field: 'process.hash.md5', value: ['def456'] },
      ]);
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ typeKey: OBSERVABLE_TYPE_FILE_HASH.key, value: 'abc123' }),
          expect.objectContaining({ typeKey: OBSERVABLE_TYPE_FILE_HASH.key, value: 'def456' }),
        ])
      );
    });

    it('extracts file.path', () => {
      const result = service.extractFromAlert([
        { field: 'file.path', value: ['/usr/bin/malware'] },
      ]);
      expect(result).toEqual([
        expect.objectContaining({
          typeKey: OBSERVABLE_TYPE_FILE_PATH.key,
          value: '/usr/bin/malware',
        }),
      ]);
    });

    it('extracts dns.question.name as domain', () => {
      const result = service.extractFromAlert([
        { field: 'dns.question.name', value: ['evil.example.com'] },
      ]);
      expect(result).toEqual([
        expect.objectContaining({ typeKey: OBSERVABLE_TYPE_DOMAIN.key, value: 'evil.example.com' }),
      ]);
    });

    it('extracts agent.id', () => {
      const result = service.extractFromAlert([{ field: 'agent.id', value: ['agent-abc-123'] }]);
      expect(result).toEqual([
        expect.objectContaining({ typeKey: OBSERVABLE_TYPE_AGENT_ID.key, value: 'agent-abc-123' }),
      ]);
    });

    it('extracts user.name', () => {
      const result = service.extractFromAlert([{ field: 'user.name', value: ['jdoe'] }]);
      expect(result).toEqual([
        expect.objectContaining({ typeKey: OBSERVABLE_TYPE_USER.key, value: 'jdoe' }),
      ]);
    });

    it('extracts user.email', () => {
      const result = service.extractFromAlert([
        { field: 'user.email', value: ['jdoe@example.com'] },
      ]);
      expect(result).toEqual([
        expect.objectContaining({ typeKey: OBSERVABLE_TYPE_EMAIL.key, value: 'jdoe@example.com' }),
      ]);
    });

    it('extracts process.name', () => {
      const result = service.extractFromAlert([{ field: 'process.name', value: ['svchost.exe'] }]);
      expect(result).toEqual([
        expect.objectContaining({ typeKey: OBSERVABLE_TYPE_PROCESS.key, value: 'svchost.exe' }),
      ]);
    });

    it('extracts process.executable', () => {
      const result = service.extractFromAlert([
        { field: 'process.executable', value: ['C:\\Windows\\System32\\cmd.exe'] },
      ]);
      expect(result).toEqual([
        expect.objectContaining({
          typeKey: OBSERVABLE_TYPE_PROCESS.key,
          value: 'C:\\Windows\\System32\\cmd.exe',
        }),
      ]);
    });

    it('extracts url.full', () => {
      const result = service.extractFromAlert([
        { field: 'url.full', value: ['https://evil.example.com/payload'] },
      ]);
      expect(result).toEqual([
        expect.objectContaining({
          typeKey: OBSERVABLE_TYPE_URL.key,
          value: 'https://evil.example.com/payload',
        }),
      ]);
    });

    it('extracts url.original', () => {
      const result = service.extractFromAlert([
        { field: 'url.original', value: ['http://malware.test/dl'] },
      ]);
      expect(result).toEqual([
        expect.objectContaining({
          typeKey: OBSERVABLE_TYPE_URL.key,
          value: 'http://malware.test/dl',
        }),
      ]);
    });

    it('extracts registry.path', () => {
      const result = service.extractFromAlert([
        {
          field: 'registry.path',
          value: ['HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\malware'],
        },
      ]);
      expect(result).toEqual([
        expect.objectContaining({
          typeKey: OBSERVABLE_TYPE_REGISTRY.key,
          value: 'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\malware',
        }),
      ]);
    });

    it('extracts service.name', () => {
      const result = service.extractFromAlert([
        { field: 'service.name', value: ['suspicious-daemon'] },
      ]);
      expect(result).toEqual([
        expect.objectContaining({
          typeKey: OBSERVABLE_TYPE_SERVICE.key,
          value: 'suspicious-daemon',
        }),
      ]);
    });

    it('handles multiple values per field', () => {
      const result = service.extractFromAlert([
        { field: 'source.ip', value: ['10.0.0.1', '10.0.0.2'] },
      ]);
      expect(result).toHaveLength(2);
    });

    it('deduplicates identical type+value pairs', () => {
      const result = service.extractFromAlert([
        { field: 'file.hash.sha256', value: ['same-hash'] },
        { field: 'file.hash.sha512', value: ['same-hash'] },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('same-hash');
    });

    it('allows same value with different types', () => {
      const result = service.extractFromAlert([
        { field: 'host.name', value: ['name'] },
        { field: 'file.path', value: ['name'] },
      ]);
      expect(result).toHaveLength(2);
      expect(result.map((o) => o.typeKey)).toEqual(
        expect.arrayContaining([OBSERVABLE_TYPE_HOSTNAME.key, OBSERVABLE_TYPE_FILE_PATH.key])
      );
    });

    it('skips entries with no value', () => {
      const result = service.extractFromAlert([
        { field: 'host.name' },
        { field: 'source.ip', value: null },
        { field: 'user.name', value: [] },
      ]);
      expect(result).toEqual([]);
    });

    it('skips entries with empty string values', () => {
      const result = service.extractFromAlert([
        { field: 'host.name', value: [''] },
        { field: 'user.name', value: ['  '] },
      ]);
      expect(result).toEqual([]);
    });

    it('trims whitespace from values', () => {
      const result = service.extractFromAlert([{ field: 'host.name', value: ['  server-01  '] }]);
      expect(result).toEqual([expect.objectContaining({ value: 'server-01' })]);
    });

    it('ignores unmapped ECS fields', () => {
      const result = service.extractFromAlert([
        { field: 'event.action', value: ['connection_attempted'] },
        { field: 'cloud.provider', value: ['aws'] },
      ]);
      expect(result).toEqual([]);
    });

    it('handles string value instead of array', () => {
      const result = service.extractFromAlert([{ field: 'host.name', value: 'my-host' }]);
      expect(result).toEqual([
        expect.objectContaining({ typeKey: OBSERVABLE_TYPE_HOSTNAME.key, value: 'my-host' }),
      ]);
    });

    it('extracts all 13 observable types from a comprehensive alert', () => {
      const fullAlert: EcsFieldEntry[] = [
        { field: 'source.ip', value: ['192.168.1.1'] },
        { field: 'destination.ip', value: ['fe80::1'] },
        { field: 'host.name', value: ['web-01'] },
        { field: 'file.hash.sha256', value: ['deadbeef'] },
        { field: 'file.path', value: ['/tmp/payload'] },
        { field: 'dns.question.name', value: ['c2.evil.com'] },
        { field: 'agent.id', value: ['agent-1'] },
        { field: 'user.name', value: ['admin'] },
        { field: 'user.email', value: ['admin@corp.local'] },
        { field: 'process.name', value: ['powershell.exe'] },
        { field: 'url.full', value: ['https://c2.evil.com/beacon'] },
        { field: 'registry.path', value: ['HKLM\\Run\\evil'] },
        { field: 'service.name', value: ['backdoor-svc'] },
      ];

      const result = service.extractFromAlert(fullAlert);
      const typeKeys = new Set(result.map((o) => o.typeKey));

      expect(typeKeys).toContain(OBSERVABLE_TYPE_IPV4.key);
      expect(typeKeys).toContain(OBSERVABLE_TYPE_IPV6.key);
      expect(typeKeys).toContain(OBSERVABLE_TYPE_HOSTNAME.key);
      expect(typeKeys).toContain(OBSERVABLE_TYPE_FILE_HASH.key);
      expect(typeKeys).toContain(OBSERVABLE_TYPE_FILE_PATH.key);
      expect(typeKeys).toContain(OBSERVABLE_TYPE_DOMAIN.key);
      expect(typeKeys).toContain(OBSERVABLE_TYPE_AGENT_ID.key);
      expect(typeKeys).toContain(OBSERVABLE_TYPE_USER.key);
      expect(typeKeys).toContain(OBSERVABLE_TYPE_EMAIL.key);
      expect(typeKeys).toContain(OBSERVABLE_TYPE_PROCESS.key);
      expect(typeKeys).toContain(OBSERVABLE_TYPE_URL.key);
      expect(typeKeys).toContain(OBSERVABLE_TYPE_REGISTRY.key);
      expect(typeKeys).toContain(OBSERVABLE_TYPE_SERVICE.key);
      expect(result).toHaveLength(13);
    });
  });

  describe('bulkExtract', () => {
    it('extracts from multiple alerts', () => {
      const result = service.bulkExtract([
        [{ field: 'host.name', value: ['host-1'] }],
        [{ field: 'host.name', value: ['host-2'] }],
      ]);

      expect(result.observables).toHaveLength(2);
      expect(result.processedAlerts).toBe(2);
    });

    it('deduplicates across alerts', () => {
      const result = service.bulkExtract([
        [{ field: 'source.ip', value: ['10.0.0.1'] }],
        [{ field: 'source.ip', value: ['10.0.0.1'] }],
        [{ field: 'source.ip', value: ['10.0.0.2'] }],
      ]);

      expect(result.observables).toHaveLength(2);
      expect(result.processedAlerts).toBe(3);
    });

    it('reports correct fieldsInspected count', () => {
      const result = service.bulkExtract([
        [
          { field: 'host.name', value: ['h1', 'h2'] },
          { field: 'source.ip', value: ['10.0.0.1'] },
        ],
      ]);
      expect(result.fieldsInspected).toBe(3);
    });

    it('handles empty alerts array', () => {
      const result = service.bulkExtract([]);
      expect(result.observables).toEqual([]);
      expect(result.processedAlerts).toBe(0);
      expect(result.fieldsInspected).toBe(0);
      expect(result.excluded).toBe(0);
    });

    it('handles alerts with no matching fields', () => {
      const result = service.bulkExtract([[{ field: 'event.category', value: ['network'] }]]);
      expect(result.observables).toEqual([]);
      expect(result.processedAlerts).toBe(1);
    });

    it('processes realistic multi-alert scenario', () => {
      const alerts: EcsFieldEntry[][] = [
        [
          { field: 'source.ip', value: ['192.168.1.10'] },
          { field: 'destination.ip', value: ['10.0.0.5'] },
          { field: 'user.name', value: ['admin'] },
          { field: 'process.name', value: ['cmd.exe'] },
          { field: 'host.name', value: ['DC-01'] },
        ],
        [
          { field: 'source.ip', value: ['192.168.1.10'] },
          { field: 'destination.ip', value: ['10.0.0.6'] },
          { field: 'user.name', value: ['admin'] },
          { field: 'process.executable', value: ['C:\\Windows\\cmd.exe'] },
          { field: 'host.name', value: ['DC-01'] },
        ],
        [
          { field: 'source.ip', value: ['192.168.1.11'] },
          { field: 'url.full', value: ['https://evil.example.com/beacon'] },
          { field: 'service.name', value: ['httpd'] },
          { field: 'dns.question.name', value: ['evil.example.com'] },
        ],
      ];

      const result = service.bulkExtract(alerts);
      expect(result.processedAlerts).toBe(3);
      expect(result.observables.length).toBeGreaterThan(0);

      const values = result.observables.map((o) => o.value);
      expect(values).toContain('192.168.1.10');
      expect(values).toContain('10.0.0.5');
      expect(values).toContain('10.0.0.6');
      expect(values).toContain('admin');
      expect(values).toContain('cmd.exe');
      expect(values).toContain('DC-01');
      expect(values).toContain('C:\\Windows\\cmd.exe');
      expect(values).toContain('192.168.1.11');
      expect(values).toContain('https://evil.example.com/beacon');
      expect(values).toContain('httpd');
      expect(values).toContain('evil.example.com');
    });
  });

  describe('exclusion filters', () => {
    it('excludes exact match values', () => {
      const config: ExtractionConfig = {
        exclusionFilters: {
          [OBSERVABLE_TYPE_USER.key]: ['SYSTEM', 'LOCAL SERVICE'],
        },
      };
      service = new EntityExtractionService(createLogger(), config);

      const result = service.bulkExtract([
        [
          { field: 'user.name', value: ['SYSTEM'] },
          { field: 'user.name', value: ['jdoe'] },
          { field: 'user.name', value: ['LOCAL SERVICE'] },
        ],
      ]);

      expect(result.observables).toHaveLength(1);
      expect(result.observables[0].value).toBe('jdoe');
      expect(result.excluded).toBe(2);
    });

    it('exclusion matching is case-insensitive', () => {
      const config: ExtractionConfig = {
        exclusionFilters: {
          [OBSERVABLE_TYPE_USER.key]: ['system'],
        },
      };
      service = new EntityExtractionService(createLogger(), config);

      const result = service.extractFromAlert([{ field: 'user.name', value: ['SYSTEM'] }]);
      expect(result).toEqual([]);
    });

    it('supports glob-style prefix matching with trailing *', () => {
      const config: ExtractionConfig = {
        exclusionFilters: {
          [OBSERVABLE_TYPE_USER.key]: ['NT AUTHORITY\\*'],
        },
      };
      service = new EntityExtractionService(createLogger(), config);

      const result = service.bulkExtract([
        [
          { field: 'user.name', value: ['NT AUTHORITY\\SYSTEM'] },
          { field: 'user.name', value: ['NT AUTHORITY\\LOCAL SERVICE'] },
          { field: 'user.name', value: ['real-user'] },
        ],
      ]);

      expect(result.observables).toHaveLength(1);
      expect(result.observables[0].value).toBe('real-user');
      expect(result.excluded).toBe(2);
    });

    it('does not exclude values for types without filters', () => {
      const config: ExtractionConfig = {
        exclusionFilters: {
          [OBSERVABLE_TYPE_USER.key]: ['SYSTEM'],
        },
      };
      service = new EntityExtractionService(createLogger(), config);

      const result = service.extractFromAlert([{ field: 'host.name', value: ['SYSTEM'] }]);
      expect(result).toHaveLength(1);
    });
  });

  describe('custom configuration', () => {
    it('uses custom description', () => {
      const config: ExtractionConfig = {
        description: 'Extracted by automated pipeline',
      };
      service = new EntityExtractionService(createLogger(), config);

      const result = service.extractFromAlert([{ field: 'host.name', value: ['server-01'] }]);
      expect(result[0].description).toBe('Extracted by automated pipeline');
    });

    it('supports custom field mappings', () => {
      const config: ExtractionConfig = {
        fieldMappings: [{ ecsField: 'custom.field', typeKey: 'custom-type', strategy: 'static' }],
      };
      service = new EntityExtractionService(createLogger(), config);

      const result = service.extractFromAlert([
        { field: 'custom.field', value: ['custom-value'] },
        { field: 'host.name', value: ['ignored-because-not-in-custom-mappings'] },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        typeKey: 'custom-type',
        value: 'custom-value',
        description: 'Auto extracted observable',
      });
    });

    it('custom mappings can use ip strategy', () => {
      const config: ExtractionConfig = {
        fieldMappings: [
          { ecsField: 'custom.ip', typeKey: OBSERVABLE_TYPE_IPV4.key, strategy: 'ip' },
        ],
      };
      service = new EntityExtractionService(createLogger(), config);

      const result = service.extractFromAlert([{ field: 'custom.ip', value: ['::1'] }]);

      expect(result[0].typeKey).toBe(OBSERVABLE_TYPE_IPV6.key);
    });
  });

  describe('edge cases', () => {
    it('handles very large number of alerts efficiently', () => {
      const alerts: EcsFieldEntry[][] = Array.from({ length: 1000 }, (_, i) => [
        { field: 'source.ip', value: [`10.0.${Math.floor(i / 256)}.${i % 256}`] },
        { field: 'user.name', value: [`user-${i}`] },
      ]);

      const start = Date.now();
      const result = service.bulkExtract(alerts);
      const elapsed = Date.now() - start;

      expect(result.processedAlerts).toBe(1000);
      expect(result.observables.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(5000);
    });

    it('handles alerts with mixed null/undefined/empty values', () => {
      const result = service.bulkExtract([
        [
          { field: 'host.name', value: null },
          { field: 'host.name', value: undefined },
          { field: 'host.name', value: [] },
          { field: 'host.name', value: ['', null as unknown as string] },
          { field: 'host.name', value: ['valid-host'] },
        ],
      ]);

      expect(result.observables).toHaveLength(1);
      expect(result.observables[0].value).toBe('valid-host');
    });

    it('handles empty alert (no fields)', () => {
      const result = service.extractFromAlert([]);
      expect(result).toEqual([]);
    });
  });
});

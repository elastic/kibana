/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryPolicyTemplate } from '../../../../../types';

import { mapInputsToIngestionMethods } from './map_ingestion_method';

describe('mapInputsToIngestionMethods', () => {
  it('should return empty Set when no policy templates provided', () => {
    const result = mapInputsToIngestionMethods(undefined);
    expect(result.size).toBe(0);
  });

  it('should return empty Set when empty array provided', () => {
    const result = mapInputsToIngestionMethods([]);
    expect(result.size).toBe(0);
  });

  it('should map API input types correctly', () => {
    const policyTemplates: RegistryPolicyTemplate[] = [
      {
        name: 'test',
        title: 'Test',
        description: 'Test template',
        inputs: [
          { type: 'httpjson', title: 'HTTP JSON', description: 'HTTP JSON input' },
          { type: 'cel', title: 'CEL', description: 'CEL input' },
          {
            type: 'entity-analytics',
            title: 'Entity Analytics',
            description: 'Entity Analytics input',
          },
          { type: 'o365audit', title: 'O365 Audit', description: 'O365 Audit input' },
          { type: 'salesforce', title: 'Salesforce', description: 'Salesforce input' },
          { type: 'streaming', title: 'Streaming', description: 'Streaming input' },
          { type: 'websocket', title: 'WebSocket', description: 'WebSocket input' },
          { type: 'winlog', title: 'Windows Event Log', description: 'Windows Event Log input' },
        ],
      },
    ] as RegistryPolicyTemplate[];

    const result = mapInputsToIngestionMethods(policyTemplates);
    expect(result.size).toBe(1);
    expect(result.has('API')).toBe(true);
  });

  it('should map File input types correctly', () => {
    const policyTemplates: RegistryPolicyTemplate[] = [
      {
        name: 'test',
        title: 'Test',
        description: 'Test template',
        inputs: [
          { type: 'filestream', title: 'File Stream', description: 'File Stream input' },
          { type: 'logfile', title: 'Log File', description: 'Log File input' },
        ],
      },
    ] as RegistryPolicyTemplate[];

    const result = mapInputsToIngestionMethods(policyTemplates);
    expect(result.size).toBe(1);
    expect(result.has('File')).toBe(true);
  });

  it('should map network types correctly', () => {
    const policyTemplates: RegistryPolicyTemplate[] = [
      {
        name: 'test',
        title: 'Test',
        description: 'Test template',
        inputs: [
          { type: 'syslog', title: 'Syslog', description: 'Syslog input' },
          { type: 'tcp', title: 'TCP', description: 'TCP input' },
          { type: 'udp', title: 'UDP', description: 'UDP input' },
        ],
      },
    ] as RegistryPolicyTemplate[];

    const result = mapInputsToIngestionMethods(policyTemplates);
    expect(result.size).toBe(1);
    expect(result.has('Network Protocol')).toBe(true);
  });

  it('should map Webhook input types correctly', () => {
    const policyTemplates: RegistryPolicyTemplate[] = [
      {
        name: 'test',
        title: 'Test',
        description: 'Test template',
        inputs: [
          { type: 'http_endpoint', title: 'HTTP Endpoint', description: 'HTTP Endpoint input' },
        ],
      },
    ] as RegistryPolicyTemplate[];

    const result = mapInputsToIngestionMethods(policyTemplates);
    expect(result.size).toBe(1);
    expect(result.has('Webhook')).toBe(true);
  });

  it('should handle lumberjack input type correctly', () => {
    const policyTemplates: RegistryPolicyTemplate[] = [
      {
        name: 'test',
        title: 'Test',
        description: 'Test template',
        inputs: [{ type: 'lumberjack', title: 'Lumberjack', description: 'Lumberjack input' }],
      },
    ] as RegistryPolicyTemplate[];

    const result = mapInputsToIngestionMethods(policyTemplates);
    expect(result.size).toBe(1);
    expect(result.has('Lumberjack')).toBe(true);
  });

  it('should filter out unmapped input types', () => {
    const policyTemplates: RegistryPolicyTemplate[] = [
      {
        name: 'test',
        title: 'Test',
        description: 'Test template',
        inputs: [
          { type: 'custom-input', title: 'Custom Input', description: 'Custom input type' },
          { type: 'another-custom', title: 'Another Custom', description: 'Another custom input' },
        ],
      },
    ] as RegistryPolicyTemplate[];

    const result = mapInputsToIngestionMethods(policyTemplates);
    expect(result.size).toBe(0);
    expect(result.has('custom-input')).toBe(false);
    expect(result.has('another-custom')).toBe(false);
  });

  it('should handle mixed mapped and unmapped inputs', () => {
    const policyTemplates: RegistryPolicyTemplate[] = [
      {
        name: 'test',
        title: 'Test',
        description: 'Test template',
        inputs: [
          { type: 'httpjson', title: 'HTTP JSON', description: 'HTTP JSON input' },
          { type: 'custom-unmapped', title: 'Custom', description: 'Custom unmapped input' },
          { type: 'filestream', title: 'File Stream', description: 'File Stream input' },
          { type: 'unknown-type', title: 'Unknown', description: 'Unknown type input' },
        ],
      },
    ] as RegistryPolicyTemplate[];

    const result = mapInputsToIngestionMethods(policyTemplates);
    expect(result.size).toBe(2);
    expect(result.has('API')).toBe(true);
    expect(result.has('File')).toBe(true);
    expect(result.has('custom-unmapped')).toBe(false);
    expect(result.has('unknown-type')).toBe(false);
  });

  it('should deduplicate mapped values across multiple inputs', () => {
    const policyTemplates: RegistryPolicyTemplate[] = [
      {
        name: 'test',
        title: 'Test',
        description: 'Test template',
        inputs: [
          { type: 'httpjson', title: 'HTTP JSON', description: 'HTTP JSON input' },
          { type: 'cel', title: 'CEL', description: 'CEL input' },
          { type: 'filestream', title: 'File Stream', description: 'File Stream input' },
          { type: 'logfile', title: 'Log File', description: 'Log File input' },
        ],
      },
    ] as RegistryPolicyTemplate[];

    const result = mapInputsToIngestionMethods(policyTemplates);
    expect(result.size).toBe(2);
    expect(result.has('API')).toBe(true);
    expect(result.has('File')).toBe(true);
  });

  it('should handle multiple policy templates', () => {
    const policyTemplates: RegistryPolicyTemplate[] = [
      {
        name: 'test1',
        title: 'Test 1',
        description: 'Test template 1',
        inputs: [{ type: 'httpjson', title: 'HTTP JSON', description: 'HTTP JSON input' }],
      },
      {
        name: 'test2',
        title: 'Test 2',
        description: 'Test template 2',
        inputs: [
          { type: 'filestream', title: 'File Stream', description: 'File Stream input' },
          { type: 'tcp', title: 'TCP', description: 'TCP input' },
        ],
      },
    ] as RegistryPolicyTemplate[];

    const result = mapInputsToIngestionMethods(policyTemplates);
    expect(result.size).toBe(3);
    expect(result.has('API')).toBe(true);
    expect(result.has('File')).toBe(true);
    expect(result.has('Network Protocol')).toBe(true);
  });

  it('should handle policy templates without inputs (RegistryPolicyInputOnlyTemplate)', () => {
    const policyTemplates: RegistryPolicyTemplate[] = [
      {
        type: 'input',
        input: 'endpoint',
        template_path: 'some/path',
        name: 'test',
        title: 'Test',
        description: 'Test template',
      },
    ] as RegistryPolicyTemplate[];

    const result = mapInputsToIngestionMethods(policyTemplates);
    expect(result.size).toBe(0);
  });

  it('should handle mixed policy template types', () => {
    const policyTemplates: RegistryPolicyTemplate[] = [
      {
        name: 'integration-template',
        title: 'Integration Template',
        description: 'Integration template',
        inputs: [{ type: 'httpjson', title: 'HTTP JSON', description: 'HTTP JSON input' }],
      },
      {
        type: 'input',
        input: 'endpoint',
        template_path: 'some/path',
        name: 'input-only-template',
        title: 'Input Only Template',
        description: 'Input only template',
      },
    ] as RegistryPolicyTemplate[];

    const result = mapInputsToIngestionMethods(policyTemplates);
    expect(result.size).toBe(1);
    expect(result.has('API')).toBe(true);
  });

  it('should handle templates with empty inputs array', () => {
    const policyTemplates: RegistryPolicyTemplate[] = [
      {
        name: 'test',
        title: 'Test',
        description: 'Test template',
        inputs: [],
      },
    ] as RegistryPolicyTemplate[];

    const result = mapInputsToIngestionMethods(policyTemplates);
    expect(result.size).toBe(0);
  });
});

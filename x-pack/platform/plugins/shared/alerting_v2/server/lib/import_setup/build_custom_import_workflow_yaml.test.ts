/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { buildCustomImportWorkflowYaml } from './build_custom_import_workflow_yaml';

const base = {
  name: 'Datadog Monitors',
  importId: 'import-1',
  connectorId: 'connector-1',
  source: 'datadog',
};

describe('buildCustomImportWorkflowYaml', () => {
  it('builds a tagged workflow with the import id as a const and the webhook as its trigger', () => {
    const workflow = parse(
      buildCustomImportWorkflowYaml({ ...base, fingerprintField: 'monitor_id' })
    );

    expect(workflow).toMatchObject({
      name: 'Import: Datadog Monitors',
      enabled: true,
      tags: ['custom-import'],
      consts: { import_id: 'import-1' },
      triggers: [{ type: 'inboundWebhook.received', 'connector-id': 'connector-1' }],
    });
  });

  it('creates one alert that passes the body through and traces back to the import', () => {
    const workflow = parse(
      buildCustomImportWorkflowYaml({ ...base, fingerprintField: 'monitor_id', severity: 'high' })
    );

    expect(workflow.steps).toEqual([
      {
        name: 'create_alert',
        type: 'alerting.create_alert',
        with: {
          source: 'datadog',
          rule_id: '{{ consts.import_id }}',
          fingerprint: '{{ consts.import_id }}:{{ event.body.monitor_id }}',
          severity: 'high',
          data: '${{ event.body }}',
        },
      },
    ]);
  });

  it('puts the import id in the fingerprint so imports sharing a source do not merge', () => {
    const [first, second] = [
      buildCustomImportWorkflowYaml({ ...base, importId: 'import-1', fingerprintField: 'id' }),
      buildCustomImportWorkflowYaml({ ...base, importId: 'import-2', fingerprintField: 'id' }),
    ].map((yaml) => parse(yaml));

    expect(first.consts.import_id).not.toBe(second.consts.import_id);
    expect(first.steps[0].with.fingerprint).toContain('consts.import_id');
  });

  it('keys each payload on its own when there is no fingerprint field', () => {
    const workflow = parse(buildCustomImportWorkflowYaml(base));

    expect(workflow.steps[0].with.fingerprint).toBe(
      '{{ consts.import_id }}:{{ event.correlationKey }}'
    );
  });

  it('leaves out severity when none is set', () => {
    const workflow = parse(buildCustomImportWorkflowYaml(base));

    expect(workflow.steps[0].with).not.toHaveProperty('severity');
  });

  it('quotes names that would otherwise change the YAML structure', () => {
    const workflow = parse(buildCustomImportWorkflowYaml({ ...base, name: 'a: b\n- c: {d}' }));

    expect(workflow.name).toBe('Import: a: b\n- c: {d}');
    expect(workflow.steps).toHaveLength(1);
  });
});

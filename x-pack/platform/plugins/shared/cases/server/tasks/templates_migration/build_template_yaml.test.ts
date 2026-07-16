/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml } from 'yaml';
import { buildTemplateYaml } from './build_template_yaml';
import { CustomFieldTypes } from '../../../common/types/domain/custom_field/v1';
import { ConnectorTypes } from '../../../common/types/domain/connector/v1';
import { ParsedTemplateDefinitionSchema } from '../../../common/types/domain/template/v1';
import { loggingSystemMock } from '@kbn/core/server/mocks';

const logger = loggingSystemMock.createLogger();

interface ParsedField {
  $ref?: string;
  name?: string;
  control?: string;
  metadata?: Record<string, unknown>;
}

interface ParsedTemplate {
  name?: string;
  description?: string;
  tags?: string[];
  severity?: string;
  category?: string | null;
  assignees?: Array<{ uid: string }>;
  connector?: { type: string; id: string; fields: Record<string, unknown> | null };
  settings?: { syncAlerts: boolean; extractObservables?: boolean };
  fields: ParsedField[];
}

const parse = (input: string) => parseYaml(input) as ParsedTemplate;

const makeRef = (key: string): Map<string, string> => new Map([[key, key]]);

describe('buildTemplateYaml', () => {
  it('uses legacy template name as top-level case title fallback', () => {
    const yaml = buildTemplateYaml({ key: 'k', name: 'My Template', caseFields: null }, new Map());
    expect(parse(yaml)).toHaveProperty('name', 'My Template');
    expect(parse(yaml)).not.toHaveProperty('description');
    expect(parse(yaml)).not.toHaveProperty('tags');
  });

  it('produces an empty fields array when there are no caseFields', () => {
    const yaml = buildTemplateYaml({ key: 'k', name: 'T', caseFields: null }, new Map());
    expect(parse(yaml).fields).toEqual([]);
  });

  describe('case defaults', () => {
    it('includes case title, description, tags, severity, category, and assignees as top-level defaults', () => {
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'T',
          caseFields: {
            title: 'Case title',
            description: 'case-level',
            tags: ['triage', 'security'],
            severity: 'high',
            category: null,
            assignees: [{ uid: 'analyst-1' }],
          },
        },
        new Map()
      );
      expect(parse(yaml)).toMatchObject({
        name: 'Case title',
        description: 'case-level',
        tags: ['triage', 'security'],
        severity: 'high',
        category: null,
        assignees: [{ uid: 'analyst-1' }],
      });
    });

    it('keeps an explicit empty assignees list in YAML', () => {
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'T',
          caseFields: {
            assignees: [],
          },
        },
        new Map()
      );

      expect(parse(yaml).assignees).toEqual([]);
    });
  });

  describe('connector', () => {
    it('carries a Jira connector across as type + id + fields (dropping name)', () => {
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'T',
          caseFields: {
            connector: {
              id: 'jira-1',
              name: 'My Jira',
              type: ConnectorTypes.jira,
              fields: { issueType: '10001', priority: 'High', parent: null },
            },
          },
        },
        new Map()
      );
      expect(parse(yaml).connector).toEqual({
        type: '.jira',
        id: 'jira-1',
        fields: { issueType: '10001', priority: 'High', parent: null },
      });
      expect(parse(yaml).connector).not.toHaveProperty('name');
    });

    it('carries a ServiceNow ITSM connector with its fields', () => {
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'T',
          caseFields: {
            connector: {
              id: 'sn-1',
              name: 'My SN',
              type: ConnectorTypes.serviceNowITSM,
              fields: {
                impact: '2',
                severity: '1',
                urgency: '2',
                category: 'software',
                subcategory: null,
              },
            },
          },
        },
        new Map()
      );
      expect(parse(yaml).connector?.type).toBe('.servicenow');
      expect(parse(yaml).connector?.id).toBe('sn-1');
    });

    it('omits the .none connector (it is the implicit default)', () => {
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'T',
          caseFields: {
            connector: { id: 'none', name: 'None', type: ConnectorTypes.none, fields: null },
          },
        },
        new Map()
      );
      expect(parse(yaml)).not.toHaveProperty('connector');
    });

    it('omits connector when absent', () => {
      const yaml = buildTemplateYaml({ key: 'k', name: 'T', caseFields: null }, new Map());
      expect(parse(yaml)).not.toHaveProperty('connector');
    });
  });

  describe('settings', () => {
    it('carries syncAlerts and extractObservables across', () => {
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'T',
          caseFields: { settings: { syncAlerts: false, extractObservables: true } },
        },
        new Map()
      );
      expect(parse(yaml).settings).toEqual({ syncAlerts: false, extractObservables: true });
    });

    it('omits settings when absent', () => {
      const yaml = buildTemplateYaml({ key: 'k', name: 'T', caseFields: null }, new Map());
      expect(parse(yaml)).not.toHaveProperty('settings');
    });
  });

  describe('connector — full sub-field fidelity', () => {
    it('carries every Jira sub-field, including otherFields, without loss', () => {
      const fields = {
        issueType: '10002',
        priority: 'Highest',
        parent: 'PROJ-42',
        otherFields: '{"customfield_10010":"squad-blue","labels":["triage","p1"]}',
      };
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'T',
          caseFields: {
            connector: { id: 'jira-1', name: 'My Jira', type: ConnectorTypes.jira, fields },
          },
        },
        new Map()
      );
      // Every sub-field (including the free-form otherFields JSON) survives verbatim.
      expect(parse(yaml).connector).toEqual({ type: '.jira', id: 'jira-1', fields });
    });

    it('carries every ServiceNow SIR sub-field (mixed string/boolean) without loss', () => {
      const fields = {
        category: 'Privilege Escalation',
        destIp: true,
        malwareHash: false,
        malwareUrl: true,
        priority: '1 - Critical',
        sourceIp: true,
        subcategory: 'Local',
        additionalFields: '{"assignment_group":"soc"}',
      };
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'T',
          caseFields: {
            connector: { id: 'sir-1', name: 'My SIR', type: ConnectorTypes.serviceNowSIR, fields },
          },
        },
        new Map()
      );
      expect(parse(yaml).connector).toEqual({ type: '.servicenow-sir', id: 'sir-1', fields });
    });
  });

  describe('round-trips through ParsedTemplateDefinitionSchema', () => {
    it('produces a definition that parses with connector + settings preserved', () => {
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'T',
          caseFields: {
            severity: 'high',
            connector: {
              id: 'jira-1',
              name: 'My Jira',
              type: ConnectorTypes.jira,
              fields: { issueType: '10001', priority: 'High', parent: null },
            },
            settings: { syncAlerts: true, extractObservables: false },
          },
        },
        new Map()
      );

      const result = ParsedTemplateDefinitionSchema.safeParse(parseYaml(yaml));

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.severity).toEqual('high');
        expect(result.data.connector).toEqual({
          type: '.jira',
          id: 'jira-1',
          fields: { issueType: '10001', priority: 'High', parent: null },
        });
        expect(result.data.settings).toEqual({ syncAlerts: true, extractObservables: false });
      }
    });

    it('a fully-fleshed template (all case defaults + full Jira connector + settings + a $ref field) is schema-valid and lossless', () => {
      const connectorFields = {
        issueType: '10002',
        priority: 'Highest',
        parent: 'PROJ-42',
        otherFields: '{"labels":["triage"]}',
      };
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'Legacy template identity',
          caseFields: {
            title: 'Investigate suspicious login',
            description: 'Default case description for the blueprint',
            tags: ['security', 'triage'],
            severity: 'critical',
            category: 'Security',
            assignees: [{ uid: 'analyst-1' }, { uid: 'analyst-2' }],
            connector: {
              id: 'jira-1',
              name: 'My Jira',
              type: ConnectorTypes.jira,
              fields: connectorFields,
            },
            settings: { syncAlerts: true, extractObservables: true },
            customFields: [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'preset' }],
          },
        },
        makeRef('cf_text')
      );

      const result = ParsedTemplateDefinitionSchema.safeParse(parseYaml(yaml));
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          name: 'Investigate suspicious login',
          description: 'Default case description for the blueprint',
          tags: ['security', 'triage'],
          severity: 'critical',
          category: 'Security',
          assignees: [{ uid: 'analyst-1' }, { uid: 'analyst-2' }],
          connector: { type: '.jira', id: 'jira-1', fields: connectorFields },
          settings: { syncAlerts: true, extractObservables: true },
        });
        expect(result.data.fields).toHaveLength(1);
      }
    });
  });

  describe('$ref fields', () => {
    it('produces a $ref entry for each matched custom field key', () => {
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'T',
          caseFields: {
            customFields: [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: null }],
          },
        },
        makeRef('cf_text')
      );
      const fields = parse(yaml).fields;
      expect(fields).toHaveLength(1);
      expect(fields[0].$ref).toBe('cf_text');
    });

    it('includes TEXT default value in $ref metadata', () => {
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'T',
          caseFields: {
            customFields: [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: 'hello' }],
          },
        },
        makeRef('cf_text')
      );
      const fields = parse(yaml).fields;
      expect(fields[0].metadata?.default).toBe('hello');
    });

    it('includes NUMBER default value in $ref metadata', () => {
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'T',
          caseFields: {
            customFields: [{ key: 'cf_num', type: CustomFieldTypes.NUMBER, value: 7 }],
          },
        },
        makeRef('cf_num')
      );
      expect(parse(yaml).fields[0].metadata?.default).toBe(7);
    });

    it('includes TOGGLE default as boolean in $ref metadata', () => {
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'T',
          caseFields: {
            customFields: [{ key: 'cf_toggle', type: CustomFieldTypes.TOGGLE, value: true }],
          },
        },
        makeRef('cf_toggle')
      );
      expect(parse(yaml).fields[0].metadata?.default).toBe(true);
    });

    it('omits $ref metadata when value is null', () => {
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'T',
          caseFields: {
            customFields: [{ key: 'cf_text', type: CustomFieldTypes.TEXT, value: null }],
          },
        },
        makeRef('cf_text')
      );
      expect(parse(yaml).fields[0].metadata).toBeUndefined();
    });

    it('skips unmatched custom field key and logs a warning', () => {
      const warnSpy = jest.spyOn(logger, 'warn');
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'T',
          caseFields: {
            customFields: [{ key: 'missing', type: CustomFieldTypes.TEXT, value: null }],
          },
        },
        new Map(),
        logger
      );
      expect(parse(yaml).fields).toHaveLength(0);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"missing"'));
    });

    it('skips only the unmatched key when mixed refs are present', () => {
      const yaml = buildTemplateYaml(
        {
          key: 'k',
          name: 'T',
          caseFields: {
            customFields: [
              { key: 'known', type: CustomFieldTypes.TEXT, value: null },
              { key: 'missing', type: CustomFieldTypes.TEXT, value: null },
            ],
          },
        },
        makeRef('known'),
        logger
      );
      const fields = parse(yaml).fields;
      expect(fields).toHaveLength(1);
      expect(fields[0].$ref).toBe('known');
    });
  });
});

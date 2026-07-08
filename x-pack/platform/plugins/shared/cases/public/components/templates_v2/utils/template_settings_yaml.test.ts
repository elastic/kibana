/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as parseYaml } from 'yaml';
import { ConnectorTypes } from '../../../../common/types/domain';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import {
  splitTemplateDefinition,
  mergeTemplateDefinition,
  normalizeTemplateSettings,
  normalizeTemplateConnector,
} from './template_settings_yaml';

const jiraConnector = {
  type: ConnectorTypes.jira,
  id: 'jira-1',
  fields: { issueType: '10001', priority: 'High', parent: null },
} as CaseConnectorWithoutName;

describe('template_settings_yaml', () => {
  describe('splitTemplateDefinition', () => {
    it('extracts connector and settings and strips them from the fields YAML', () => {
      const yaml = [
        'name: My template',
        'settings:',
        '  syncAlerts: true',
        '  extractObservables: false',
        'connector:',
        '  type: .jira',
        '  id: jira-1',
        '  fields:',
        '    issueType: "10001"',
        'fields:',
        '  - $ref: affected_host',
      ].join('\n');

      const result = splitTemplateDefinition(yaml);

      expect(result.settings).toEqual({ syncAlerts: true, extractObservables: false });
      expect(result.connector).toEqual({
        type: '.jira',
        id: 'jira-1',
        fields: { issueType: '10001' },
      });
      // stripped from the buffer
      expect(result.fieldsYaml).not.toContain('settings:');
      expect(result.fieldsYaml).not.toContain('connector:');
      // fields content preserved
      const reparsed = parseYaml(result.fieldsYaml);
      expect(reparsed.name).toBe('My template');
      expect(reparsed.fields).toEqual([{ $ref: 'affected_host' }]);
    });

    it('preserves comments on the remaining fields content', () => {
      const yaml = ['# top comment', 'name: My template', 'settings:', '  syncAlerts: true'].join(
        '\n'
      );

      const result = splitTemplateDefinition(yaml);

      expect(result.fieldsYaml).toContain('# top comment');
      expect(result.settings).toEqual({ syncAlerts: true });
    });

    it('returns undefined connector/settings when absent', () => {
      const yaml = 'name: My template\nfields: []';
      const result = splitTemplateDefinition(yaml);

      expect(result.connector).toBeUndefined();
      expect(result.settings).toBeUndefined();
      expect(result.fieldsYaml).toBe(yaml);
    });

    it('returns the input untouched for empty or invalid YAML', () => {
      expect(splitTemplateDefinition('').fieldsYaml).toBe('');
      const invalid = 'name: : :';
      expect(splitTemplateDefinition(invalid).fieldsYaml).toBe(invalid);
    });
  });

  describe('mergeTemplateDefinition', () => {
    it('appends settings and connector to the fields YAML', () => {
      const fieldsYaml = 'name: My template\nfields:\n  - $ref: affected_host';

      const merged = mergeTemplateDefinition(fieldsYaml, {
        connector: jiraConnector,
        settings: { syncAlerts: true, extractObservables: true },
      });

      const parsed = parseYaml(merged);
      expect(parsed.settings).toEqual({ syncAlerts: true, extractObservables: true });
      expect(parsed.connector).toEqual({
        type: '.jira',
        id: 'jira-1',
        fields: { issueType: '10001', priority: 'High', parent: null },
      });
      expect(parsed.fields).toEqual([{ $ref: 'affected_host' }]);
    });

    it('omits an empty settings block and a none/absent connector', () => {
      const fieldsYaml = 'name: My template\nfields: []';

      const merged = mergeTemplateDefinition(fieldsYaml, {
        connector: {
          type: ConnectorTypes.none,
          id: 'none',
          fields: null,
        } as CaseConnectorWithoutName,
        settings: {},
      });

      expect(merged).not.toContain('settings:');
      expect(merged).not.toContain('connector:');
    });

    it('round-trips split -> merge back to an equivalent definition', () => {
      const original = [
        'name: My template',
        'severity: high',
        'connector:',
        '  type: .jira',
        '  id: jira-1',
        '  fields:',
        '    issueType: "10001"',
        '    priority: High',
        '    parent: null',
        'settings:',
        '  syncAlerts: true',
        '  extractObservables: true',
        'fields:',
        '  - $ref: affected_host',
      ].join('\n');

      const split = splitTemplateDefinition(original);
      const merged = mergeTemplateDefinition(split.fieldsYaml, {
        connector: split.connector,
        settings: split.settings,
      });

      expect(parseYaml(merged)).toEqual(parseYaml(original));
    });
  });

  describe('normalizeTemplateSettings', () => {
    it('collapses unset / empty settings to undefined', () => {
      expect(normalizeTemplateSettings(undefined)).toBeUndefined();
      expect(normalizeTemplateSettings({})).toBeUndefined();
      expect(normalizeTemplateSettings({ syncAlerts: undefined })).toBeUndefined();
    });

    it('keeps only defined settings so transient shapes compare equal', () => {
      expect(normalizeTemplateSettings({ syncAlerts: false })).toEqual({ syncAlerts: false });
      expect(
        normalizeTemplateSettings({ syncAlerts: true, extractObservables: undefined })
      ).toEqual({
        syncAlerts: true,
      });
    });
  });

  describe('normalizeTemplateConnector', () => {
    it('collapses the none / absent connector to undefined', () => {
      expect(normalizeTemplateConnector(undefined)).toBeUndefined();
      expect(
        normalizeTemplateConnector({
          type: ConnectorTypes.none,
          id: 'none',
          fields: null,
        } as CaseConnectorWithoutName)
      ).toBeUndefined();
    });

    it('preserves a real connector', () => {
      expect(normalizeTemplateConnector(jiraConnector)).toEqual(jiraConnector);
    });
  });
});

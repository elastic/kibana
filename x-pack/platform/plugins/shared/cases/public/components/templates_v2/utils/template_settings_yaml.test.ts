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
  getTemplateSettingsAndConnectorFromYaml,
  mergeTemplateDefinition,
  stripTemplateConfigBlocks,
  normalizeTemplateSettings,
  normalizeTemplateConnector,
} from './template_settings_yaml';

const jiraConnector = {
  type: ConnectorTypes.jira,
  id: 'jira-1',
  fields: { issueType: '10001', priority: 'High', parent: null },
} as CaseConnectorWithoutName;

describe('template_settings_yaml', () => {
  describe('getTemplateSettingsAndConnectorFromYaml', () => {
    it('reads connector and settings from a full definition YAML', () => {
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
      ].join('\n');

      const result = getTemplateSettingsAndConnectorFromYaml(yaml);

      expect(result.settings).toEqual({ syncAlerts: true, extractObservables: false });
      expect(result.connector).toEqual({
        type: '.jira',
        id: 'jira-1',
        fields: { issueType: '10001' },
      });
    });

    it('returns empty result for invalid YAML or malformed blocks', () => {
      expect(getTemplateSettingsAndConnectorFromYaml('name: : :')).toEqual({});
      expect(
        getTemplateSettingsAndConnectorFromYaml('name: T\nsettings: not-an-object\nconnector: nope')
      ).toEqual({});
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

    it('writes an explicit settings block but OMITS the .none connector (implicit default)', () => {
      const fieldsYaml = 'name: My template\nfields: []';

      const merged = mergeTemplateDefinition(fieldsYaml, {
        connector: {
          type: ConnectorTypes.none,
          id: 'none',
          fields: null,
        } as CaseConnectorWithoutName,
        settings: {},
      });

      const parsed = parseYaml(merged);
      expect(parsed.settings).toEqual({ syncAlerts: false, extractObservables: false });
      expect(parsed).not.toHaveProperty('connector');
    });

    it('removes a stale connector block when merging with no real connector', () => {
      const fieldsYaml = [
        'name: My template',
        'connector:',
        '  type: .jira',
        '  id: jira-1',
        '  fields: null',
        'fields: []',
      ].join('\n');

      const merged = mergeTemplateDefinition(fieldsYaml, { connector: undefined, settings: {} });

      expect(parseYaml(merged)).not.toHaveProperty('connector');
    });

    it('keeps explicit false settings values in YAML', () => {
      const fieldsYaml = 'name: My template\nfields: []';

      const merged = mergeTemplateDefinition(fieldsYaml, {
        settings: { syncAlerts: false, extractObservables: false },
      });

      const parsed = parseYaml(merged);
      expect(parsed.settings).toEqual({ syncAlerts: false, extractObservables: false });
    });

    it('re-applies extracted settings and connector to a definition', () => {
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
      const fieldsYaml = [
        'name: My template',
        'severity: high',
        'fields:',
        '  - $ref: affected_host',
      ].join('\n');

      const extracted = getTemplateSettingsAndConnectorFromYaml(original);
      const merged = mergeTemplateDefinition(fieldsYaml, extracted);

      expect(parseYaml(merged)).toEqual(parseYaml(original));
    });
  });

  describe('stripTemplateConfigBlocks', () => {
    it('removes connector and settings, preserving the rest of the blueprint', () => {
      const yaml = [
        'name: My template',
        'severity: high',
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

      const parsed = parseYaml(stripTemplateConfigBlocks(yaml));

      expect(parsed).not.toHaveProperty('connector');
      expect(parsed).not.toHaveProperty('settings');
      expect(parsed).toMatchObject({
        name: 'My template',
        severity: 'high',
        fields: [{ $ref: 'affected_host' }],
      });
    });

    it('returns the input verbatim when there is nothing to strip', () => {
      const yaml = 'name: My template\nfields: []\n';
      expect(stripTemplateConfigBlocks(yaml)).toBe(yaml);
    });

    it('is safe on malformed YAML', () => {
      expect(stripTemplateConfigBlocks('name: : :')).toBe('name: : :');
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

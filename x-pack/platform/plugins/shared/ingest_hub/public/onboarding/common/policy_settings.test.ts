/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  compactPolicySettings,
  detectPolicySettingsDrift,
  getPolicySettings,
  getPolicySettingsUpdate,
  getPolicyVarSettings,
  getPolicyVarSettingsUpdate,
  getReroutePermissions,
  parseCustomFields,
  serializeCustomFields,
  supportsPolicySetting,
} from './policy_settings';

describe('policy settings', () => {
  it('applies the output to agent-based deploys only', () => {
    expect(supportsPolicySetting('output_id', 'agent_based')).toBe(true);
    expect(supportsPolicySetting('output_id', 'managed_integration')).toBe(false);
    expect(supportsPolicySetting('output_id', 'ecf')).toBe(false);
  });

  it('applies the condition to agent-based deploys only', () => {
    expect(supportsPolicySetting('condition', 'agent_based')).toBe(true);
    expect(supportsPolicySetting('condition', 'managed_integration')).toBe(false);
    expect(supportsPolicySetting('condition', 'ecf')).toBe(false);
  });

  describe('compactPolicySettings', () => {
    it('leaves out empty settings', () => {
      expect(compactPolicySettings({ output_id: '' })).toEqual({});
      expect(compactPolicySettings({ condition: '   ' })).toEqual({});
      expect(compactPolicySettings({ output_id: 'logstash-1' })).toEqual({
        output_id: 'logstash-1',
      });
      expect(compactPolicySettings(undefined)).toEqual({});
    });
  });

  describe('getPolicySettings', () => {
    it('gives a new policy the settings of its deployment method that have a value', () => {
      expect(getPolicySettings({ output_id: 'logstash-1' }, 'agent_based')).toEqual({
        output_id: 'logstash-1',
      });
      expect(getPolicySettings({ output_id: '' }, 'agent_based')).toEqual({});
      expect(getPolicySettings({ output_id: 'logstash-1' }, 'managed_integration')).toEqual({});
    });

    it('gives a new agent-based policy the condition, unless it is blank', () => {
      const condition = '${host.platform} == "linux"';
      expect(getPolicySettings({ output_id: 'logstash-1', condition }, 'agent_based')).toEqual({
        output_id: 'logstash-1',
        condition,
      });
      expect(getPolicySettings({ condition: '  ' }, 'agent_based')).toEqual({});
      expect(getPolicySettings({ condition }, 'managed_integration')).toEqual({});
    });

    it('leaves out a value of the wrong type read back from the saved object', () => {
      expect(getPolicySettings({ output_id: 1 }, 'agent_based')).toEqual({});
      expect(getPolicySettings({ output_id: { id: 'logstash-1' } }, 'agent_based')).toEqual({});
    });

    it('leaves out settings it does not know', () => {
      expect(getPolicySettings({ unknown_setting: 'value' }, 'agent_based')).toEqual({});
    });
  });

  describe('getPolicySettingsUpdate', () => {
    it('sends a chosen setting as it is', () => {
      expect(getPolicySettingsUpdate({ output_id: 'logstash-1' }, 'agent_based')).toEqual({
        output_id: 'logstash-1',
      });
    });

    it('clears a setting set back to empty', () => {
      expect(getPolicySettingsUpdate({ output_id: '' }, 'agent_based')).toEqual({
        output_id: null,
      });
    });

    it('clears a condition set back to blank', () => {
      expect(getPolicySettingsUpdate({ condition: ' ' }, 'agent_based')).toEqual({
        condition: null,
      });
    });

    it('leaves out a value of the wrong type, so the policy keeps its own', () => {
      expect(getPolicySettingsUpdate({ output_id: 1 }, 'agent_based')).toEqual({});
      expect(getPolicySettingsUpdate({ output_id: ['logstash-1'] }, 'agent_based')).toEqual({});
    });

    it('leaves out a setting never chosen, and those of other deployment methods', () => {
      expect(getPolicySettingsUpdate({}, 'agent_based')).toEqual({});
      expect(getPolicySettingsUpdate({ output_id: 'logstash-1' }, 'managed_integration')).toEqual(
        {}
      );
    });
  });

  describe('detectPolicySettingsDrift', () => {
    it('is dirty when a setting of the deployment method changed', () => {
      expect(
        detectPolicySettingsDrift(
          { output_id: 'kafka-1' },
          { output_id: 'logstash-1' },
          'agent_based'
        )
      ).toBe(true);
      expect(
        detectPolicySettingsDrift({ output_id: '' }, { output_id: 'logstash-1' }, 'agent_based')
      ).toBe(true);
    });

    it('is dirty when the condition changed', () => {
      expect(
        detectPolicySettingsDrift(
          { condition: '${host.platform} == "linux"' },
          { condition: '${host.platform} == "windows"' },
          'agent_based'
        )
      ).toBe(true);
      expect(
        detectPolicySettingsDrift({}, { condition: '${host.platform} == "linux"' }, 'agent_based')
      ).toBe(true);
      expect(
        detectPolicySettingsDrift(
          { condition: '${host.platform} == "linux"' },
          {},
          'managed_integration'
        )
      ).toBe(false);
    });

    it('treats an empty setting and an absent one alike', () => {
      expect(detectPolicySettingsDrift({ output_id: '' }, undefined, 'agent_based')).toBe(false);
      expect(detectPolicySettingsDrift({ condition: '  ' }, undefined, 'agent_based')).toBe(false);
    });

    it('ignores a value of the wrong type, as the deploy does', () => {
      expect(detectPolicySettingsDrift({ output_id: 1 }, {}, 'agent_based')).toBe(false);
    });

    it('ignores settings of other deployment methods', () => {
      expect(detectPolicySettingsDrift({ output_id: 'kafka-1' }, {}, 'managed_integration')).toBe(
        false
      );
    });
  });

  describe('proxy_url (a package var)', () => {
    const declared = new Set(['proxy_url', 'default_region']);

    it('applies to agent-based and managed integration deploys, not ECF', () => {
      expect(supportsPolicySetting('proxy_url', 'agent_based')).toBe(true);
      expect(supportsPolicySetting('proxy_url', 'managed_integration')).toBe(true);
      expect(supportsPolicySetting('proxy_url', 'ecf')).toBe(false);
    });

    it('is not a top-level package policy field', () => {
      const settings = { output_id: 'logstash-1', proxy_url: 'http://proxy:3128' };
      expect(getPolicySettings(settings, 'agent_based')).toEqual({ output_id: 'logstash-1' });
      expect(getPolicySettingsUpdate(settings, 'agent_based')).toEqual({
        output_id: 'logstash-1',
      });
    });

    it('is sent as a var only when the package declares it', () => {
      const settings = { proxy_url: 'http://proxy:3128' };
      expect(getPolicyVarSettings(settings, 'agent_based', declared)).toEqual(settings);
      expect(getPolicyVarSettings(settings, 'managed_integration', declared)).toEqual(settings);
      expect(getPolicyVarSettings(settings, 'agent_based', new Set(['default_region']))).toEqual(
        {}
      );
      expect(getPolicyVarSettings(settings, 'ecf', declared)).toEqual({});
      expect(getPolicyVarSettings(settings, 'agent_based')).toEqual(settings);
    });

    it('leaves out an empty or invalid value on create', () => {
      expect(getPolicyVarSettings({ proxy_url: '' }, 'agent_based', declared)).toEqual({});
      expect(getPolicyVarSettings({ proxy_url: 1 }, 'agent_based', declared)).toEqual({});
    });

    it('clears the var on update with null, and leaves it alone when never set', () => {
      expect(getPolicyVarSettingsUpdate({ proxy_url: '' }, 'agent_based', declared)).toEqual({
        proxy_url: null,
      });
      expect(getPolicyVarSettingsUpdate({}, 'agent_based', declared)).toEqual({});
      expect(
        getPolicyVarSettingsUpdate({ proxy_url: 'http://p:1' }, 'managed_integration', declared)
      ).toEqual({ proxy_url: 'http://p:1' });
      expect(
        getPolicyVarSettingsUpdate({ proxy_url: '' }, 'agent_based', new Set(['default_region']))
      ).toEqual({});
    });

    it('trims what was typed, and treats blank as empty', () => {
      expect(getPolicyVarSettings({ proxy_url: ' http://p:1 ' }, 'agent_based', declared)).toEqual({
        proxy_url: 'http://p:1',
      });
      expect(getPolicyVarSettings({ proxy_url: '  ' }, 'agent_based', declared)).toEqual({});
      expect(getPolicyVarSettingsUpdate({ proxy_url: '  ' }, 'agent_based', declared)).toEqual({
        proxy_url: null,
      });
      expect(compactPolicySettings({ proxy_url: ' http://p:1 ' })).toEqual({
        proxy_url: 'http://p:1',
      });
    });

    it('marks the deployment dirty when only the proxy changed', () => {
      expect(detectPolicySettingsDrift({ proxy_url: 'http://p:1' }, {}, 'agent_based')).toBe(true);
      expect(
        detectPolicySettingsDrift(
          { proxy_url: '' },
          { proxy_url: 'http://p:1' },
          'managed_integration'
        )
      ).toBe(true);
      expect(detectPolicySettingsDrift({ proxy_url: 'http://p:1' }, {}, 'ecf')).toBe(false);
    });
  });

  describe('additional_datastreams_permissions (a list)', () => {
    const key = 'additional_datastreams_permissions';

    it('applies to agent-based and managed integration deploys, not ECF', () => {
      expect(supportsPolicySetting(key, 'agent_based')).toBe(true);
      expect(supportsPolicySetting(key, 'managed_integration')).toBe(true);
      expect(supportsPolicySetting(key, 'ecf')).toBe(false);
    });

    it('is a top-level package policy field, sent to a new policy of both methods', () => {
      const settings = { [key]: ['logs-a-default', 'metrics-b-default'] };
      expect(getPolicySettings(settings, 'agent_based')).toEqual(settings);
      expect(getPolicySettings(settings, 'managed_integration')).toEqual(settings);
      expect(getPolicyVarSettings(settings, 'agent_based')).toEqual({});
      expect(getPolicySettings(settings, 'ecf')).toEqual({});
    });

    it('trims entries and drops blank and repeated ones', () => {
      expect(
        compactPolicySettings({ [key]: [' logs-a-default ', '', 'logs-a-default', '  '] })
      ).toEqual({ [key]: ['logs-a-default'] });
    });

    it('reads the list for Step 2, and anything else as no permissions', () => {
      expect(getReroutePermissions({ [key]: ['logs-a-default'] })).toEqual(['logs-a-default']);
      expect(getReroutePermissions({})).toEqual([]);
      expect(getReroutePermissions(undefined)).toEqual([]);
      // The saved object is an open record, so an API write can leave these.
      expect(getReroutePermissions({ [key]: 'logs-a-default' })).toEqual([]);
      expect(getReroutePermissions({ [key]: ['logs-a-default', 1] })).toEqual([]);
      expect(getReroutePermissions({ [key]: null })).toEqual([]);
    });

    it('treats an empty list as empty', () => {
      expect(compactPolicySettings({ [key]: [] })).toEqual({});
      expect(getPolicySettings({ [key]: [] }, 'agent_based')).toEqual({});
    });

    it('leaves out a value of the wrong type read back from the saved object', () => {
      expect(getPolicySettings({ [key]: 'logs-a-default' }, 'agent_based')).toEqual({});
      expect(getPolicySettings({ [key]: ['logs-a-default', 1] }, 'agent_based')).toEqual({});
    });

    it('clears the list on update with an empty list, which both Fleet APIs accept', () => {
      expect(getPolicySettingsUpdate({ [key]: [] }, 'agent_based')).toEqual({ [key]: [] });
      expect(getPolicySettingsUpdate({ [key]: [] }, 'managed_integration')).toEqual({ [key]: [] });
    });

    it('sends the chosen list on update, and leaves it alone when never set', () => {
      expect(getPolicySettingsUpdate({ [key]: [' logs-a-default '] }, 'agent_based')).toEqual({
        [key]: ['logs-a-default'],
      });
      expect(getPolicySettingsUpdate({}, 'managed_integration')).toEqual({});
    });

    it('marks the deployment dirty when only the list changed', () => {
      expect(detectPolicySettingsDrift({ [key]: ['logs-a-default'] }, {}, 'agent_based')).toBe(
        true
      );
      expect(
        detectPolicySettingsDrift(
          { [key]: [] },
          { [key]: ['logs-a-default'] },
          'managed_integration'
        )
      ).toBe(true);
    });

    it('ignores the order of the list, but still sends it in the order chosen', () => {
      expect(
        detectPolicySettingsDrift(
          { [key]: ['logs-b-default', 'logs-a-default'] },
          { [key]: ['logs-a-default', 'logs-b-default'] },
          'agent_based'
        )
      ).toBe(false);
      expect(
        detectPolicySettingsDrift(
          { [key]: ['logs-b-default', 'logs-a-default'] },
          { [key]: ['logs-a-default'] },
          'agent_based'
        )
      ).toBe(true);
      expect(
        getPolicySettingsUpdate({ [key]: ['logs-b-default', 'logs-a-default'] }, 'agent_based')
      ).toEqual({ [key]: ['logs-b-default', 'logs-a-default'] });
    });

    it('is not dirty for the same list entered differently, or an empty list and none', () => {
      expect(
        detectPolicySettingsDrift(
          { [key]: [' logs-a-default ', 'logs-a-default'] },
          { [key]: ['logs-a-default'] },
          'agent_based'
        )
      ).toBe(false);
      expect(detectPolicySettingsDrift({ [key]: [] }, {}, 'agent_based')).toBe(false);
      expect(detectPolicySettingsDrift({ [key]: ['logs-a-default'] }, {}, 'ecf')).toBe(false);
    });
  });

  describe('global_data_tags (custom fields, stored as JSON text)', () => {
    const key = 'global_data_tags';
    const fields = [
      { name: 'team', value: 'platform' },
      { name: 'env', value: 'prod' },
    ];
    const stored = serializeCustomFields(fields);

    it('applies to managed integration deploys only', () => {
      expect(supportsPolicySetting(key, 'managed_integration')).toBe(true);
      expect(supportsPolicySetting(key, 'agent_based')).toBe(false);
      expect(supportsPolicySetting(key, 'ecf')).toBe(false);
    });

    it('is sent to a new managed integration policy as the list Fleet takes', () => {
      expect(getPolicySettings({ [key]: stored }, 'managed_integration')).toEqual({
        [key]: fields,
      });
      expect(getPolicyVarSettings({ [key]: stored }, 'managed_integration')).toEqual({});
    });

    it('sends a value of digits only as a number, like Fleet, and keeps the stored text', () => {
      const numeric = serializeCustomFields([
        { name: 'priority', value: '1' },
        { name: 'code', value: '007' },
        { name: 'build', value: '1a' },
        { name: 'version', value: '1.5' },
        { name: 'neg', value: '-1' },
      ]);
      expect(getPolicySettings({ [key]: numeric }, 'managed_integration')).toEqual({
        [key]: [
          { name: 'priority', value: 1 },
          { name: 'code', value: 7 },
          { name: 'build', value: '1a' },
          { name: 'version', value: '1.5' },
          { name: 'neg', value: '-1' },
        ],
      });
      expect(getPolicySettingsUpdate({ [key]: numeric }, 'managed_integration')[key]).toEqual(
        (getPolicySettings({ [key]: numeric }, 'managed_integration') as Record<string, unknown>)[
          key
        ]
      );
      expect(compactPolicySettings({ [key]: numeric })).toEqual({ [key]: numeric });
    });

    it('keeps a number too large to hold exactly as text instead of losing digits', () => {
      const big = '12345678901234567890';
      expect(
        getPolicySettings(
          { [key]: serializeCustomFields([{ name: 'id', value: big }]) },
          'managed_integration'
        )
      ).toEqual({ [key]: [{ name: 'id', value: big }] });
    });

    it('is not sent to agent-based or ECF, which would reject or ignore it', () => {
      expect(getPolicySettings({ [key]: stored }, 'agent_based')).toEqual({});
      expect(getPolicySettings({ [key]: stored }, 'ecf')).toEqual({});
    });

    it('trims names and values and drops blank rows', () => {
      const messy = serializeCustomFields([
        { name: ' team ', value: ' platform ' },
        { name: '', value: '' },
      ]);
      expect(compactPolicySettings({ [key]: messy })).toEqual({
        [key]: serializeCustomFields([{ name: 'team', value: 'platform' }]),
      });
    });

    it('treats an empty list and only blank rows as empty', () => {
      expect(compactPolicySettings({ [key]: '[]' })).toEqual({});
      expect(
        compactPolicySettings({ [key]: serializeCustomFields([{ name: ' ', value: '' }]) })
      ).toEqual({});
      expect(getPolicySettings({ [key]: '[]' }, 'managed_integration')).toEqual({});
    });

    it('leaves out a value that is not a list of fields, read back from the saved object', () => {
      expect(getPolicySettings({ [key]: 'not json' }, 'managed_integration')).toEqual({});
      expect(getPolicySettings({ [key]: '{"name":"a"}' }, 'managed_integration')).toEqual({});
      expect(getPolicySettings({ [key]: '[{"name":"a"}]' }, 'managed_integration')).toEqual({});
      expect(getPolicySettings({ [key]: ['a=b'] }, 'managed_integration')).toEqual({});
    });

    it('reads the fields for Step 2, and anything else as none', () => {
      expect(parseCustomFields(stored)).toEqual(fields);
      expect(parseCustomFields(undefined)).toEqual([]);
      expect(parseCustomFields('not json')).toEqual([]);
      expect(parseCustomFields('[1]')).toEqual([]);
    });

    it('clears the fields on update with an empty list', () => {
      expect(getPolicySettingsUpdate({ [key]: '[]' }, 'managed_integration')).toEqual({
        [key]: [],
      });
    });

    it('sends the chosen fields on update, and leaves them alone when never set', () => {
      expect(getPolicySettingsUpdate({ [key]: stored }, 'managed_integration')).toEqual({
        [key]: fields,
      });
      expect(getPolicySettingsUpdate({}, 'managed_integration')).toEqual({});
      expect(getPolicySettingsUpdate({ [key]: stored }, 'agent_based')).toEqual({});
    });

    it('marks the deployment dirty when only the fields changed', () => {
      expect(detectPolicySettingsDrift({ [key]: stored }, {}, 'managed_integration')).toBe(true);
      expect(
        detectPolicySettingsDrift({ [key]: '[]' }, { [key]: stored }, 'managed_integration')
      ).toBe(true);
    });

    it('does not mark it dirty for a blank row or untrimmed text, or for another method', () => {
      expect(
        detectPolicySettingsDrift(
          { [key]: serializeCustomFields([...fields, { name: '', value: '' }]) },
          { [key]: stored },
          'managed_integration'
        )
      ).toBe(false);
      expect(detectPolicySettingsDrift({ [key]: stored }, {}, 'agent_based')).toBe(false);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { aiAnonymizationSettings } from '@kbn/ai-anonymization-common';
import type { AnonymizationSettings } from '@kbn/ai-anonymization-common';
import { getAnonymizationUiSettings } from './ui_settings';

describe('getAnonymizationUiSettings', () => {
  const setting = getAnonymizationUiSettings()[aiAnonymizationSettings];

  it('registers the anonymization setting in the general category for every solution view', () => {
    expect(setting.category).toEqual(['general']);
    expect(setting.solutionViews).toBeUndefined();
  });

  it('ships a valid default with masking switched off', () => {
    const settings: AnonymizationSettings = JSON.parse(String(setting.value));

    expect(() => setting.schema.validate(settings)).not.toThrow();
    expect(settings.rules).not.toHaveLength(0);
    expect(settings.maskingEnabled).toBe(false);
  });

  it('accepts a regex rule whose pattern does not compile, so one broken rule cannot make Core discard the whole saved setting on read (the pipeline fails it at run time per onFailure)', () => {
    const settings: AnonymizationSettings = JSON.parse(String(setting.value));
    const brokenRule = {
      type: 'RegExp',
      enabled: true,
      entityClass: 'MISC',
      pattern: '(unclosed',
    };

    expect(() =>
      setting.schema.validate({ ...settings, maskingEnabled: true, rules: [brokenRule] })
    ).not.toThrow();
  });

  it('accepts a very long regex pattern, so a previously saved setting is never discarded on read and silently reverted to maskingEnabled:false', () => {
    const settings: AnonymizationSettings = JSON.parse(String(setting.value));
    const longRule = {
      type: 'RegExp',
      enabled: true,
      entityClass: 'MISC',
      pattern: `(${'a|'.repeat(5000)}b)`,
    };

    expect(() =>
      setting.schema.validate({ ...settings, maskingEnabled: true, rules: [longRule] })
    ).not.toThrow();
  });
});

interface RegexRule {
  id?: string;
  type: string;
  pattern: string;
}

function getBuiltInRulePattern(ruleId: string): RegExp {
  const defaultSettings = getUiSettings()[aiAnonymizationSettings];
  const rules = JSON.parse(defaultSettings.value as string).rules as RegexRule[];
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) {
    throw new Error(`Rule ${ruleId} not found in default anonymization settings`);
  }
  return new RegExp(rule.pattern, 'g');
}

describe('getUiSettings anonymization default rules', () => {
  describe('builtin-host-name', () => {
    const hostNamePattern = getBuiltInRulePattern('builtin-host-name');

    // Regression coverage for a real production incident: enabling this rule corrupted
    // ECS/data-view field paths and source file paths in tool output and the agent's own
    // reasoning, because an earlier version accepted any letters-only final label instead
    // of a curated list of real TLDs/infra suffixes.
    const nonMatches = [
      // ECS/data-view field paths (from the actual reported incident)
      'signal.threshold_result.action_group',
      'entity.behavior.last_seen_timestamp',
      'user.effective.name',
      'process.session_leader.entity_id',
      'dll.code_signature.signing_id',
      'process.group_leader.real_user.name',
      'host.os.name',
      'host.geo.city_name',
      'agent.id',
      'host.id',
      'user.id',
      'source.ip',
      'destination.ip',
      'display_name.text',
      // Source file paths — this domain is a coding assistant, so these are common
      'server/index.ts',
      'public/plugin.tsx',
      'hooks/use_anonymization_settings.test.tsx',
      'SKILL.md',
      'README.md',
      'scripts/install.sh',
      'package.json',
      'tsconfig.json',
      'jest.config.js',
      // Model names, versions, UUIDs, hyphenated prose (earlier false-positive class)
      'gpt-4-turbo',
      'claude-3-5-sonnet-20241022',
      'well-known-multi-word-host-01-example',
      '123e4567-e89b-12d3-a456-426614174000',
    ];
    for (const input of nonMatches) {
      it(`does not match ${input}`, () => {
        expect(input.match(hostNamePattern)).toBeNull();
      });
    }

    const matches = [
      'web-01.prod.example.com',
      'db-server-2.svc.cluster.local',
      'api.openai.com',
      'github.io',
      'es01.prod.elastic.co',
      'my-service.default.svc.cluster.local',
      'internal-db.corp.acme.co.uk',
    ];
    for (const input of matches) {
      it(`matches ${input}`, () => {
        expect(input.match(hostNamePattern)).toEqual([input]);
      });
    }
  });
});

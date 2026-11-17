/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common/tools';
import {
  ALERTING_TOOL_IDS,
  RULE_AUTHORING_SKILL_ID,
  UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID,
  getUniversalAlertingFailureDiagnosisSkillBadge,
} from '@kbn/alerting-v2-constants';
import type { LoggerServiceContract } from '../../lib/services/logger_service/logger_service';
import { createAlertingV2Availability } from './alerting_v2_availability';
import { createUniversalAlertingFailureDiagnosisSkill } from './universal_alerting_failure_diagnosis_skill';

const createDeps = () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    forSubsystem: jest.fn(),
  } as unknown as LoggerServiceContract,
  getRulesClient: jest.fn(),
  getPrivilegeChecker: jest.fn(),
  availability: createAlertingV2Availability({
    getActiveSpace: jest.fn().mockResolvedValue({}),
  }),
});

describe('createUniversalAlertingFailureDiagnosisSkill', () => {
  it('registers under the stable universal-alerting-failure-diagnosis id and name', () => {
    const skill = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(skill.id).toBe(UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID);
    expect(skill.name).toBe(UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID);
    expect(skill.basePath).toBe('skills/platform/alerting');
  });

  it('keeps the slash-command id in sync with the skill badge used by the UI', () => {
    expect(getUniversalAlertingFailureDiagnosisSkillBadge()).toBe(
      `[/${UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID}](skill://${UNIVERSAL_ALERTING_FAILURE_DIAGNOSIS_SKILL_ID})`
    );
  });

  it('is not gated behind agent builder experimental features', () => {
    const skill = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(skill.experimental).not.toBe(true);
  });

  it('gates the skill on the alerting:v2:enabled advanced setting', () => {
    const skill = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(skill.uiSettingRequired).toBe('alerting:v2:enabled');
  });

  it('exposes only the rule inline tools to attach and fix rules', async () => {
    const skill = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    const inlineTools = (await skill.getInlineTools?.()) ?? [];

    expect(inlineTools.map((tool) => tool.id)).toEqual([
      ALERTING_TOOL_IDS.manageRule,
      ALERTING_TOOL_IDS.attachRule,
    ]);
  });

  it('tells the agent to classify from the error message, not the reason field', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain('Do **not** rely on the `reason` field');
  });

  it.each([
    'Unknown column',
    'Unknown index',
    'index_not_found_exception',
    'security_exception',
    'incompatible types',
    'exceeded the maximum allowed size',
    'Rule execution aborted',
    'Request aborted',
  ])('covers the "%s" failure pattern', (pattern) => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain(pattern);
  });

  it('lists several possible root causes instead of one confirmed cause', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain('**several possible root causes**');
    expect(content).toContain('Do **not** present one cause as confirmed unless you verified it');
  });

  it('lists missing privileges as a possible cause of not-found errors and explains why', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain('Missing privileges: the rule owner cannot read the index');
    expect(content).toContain('exactly like an index that does not exist');
    expect(content).toContain('Do not rewrite the query for a privileges problem');
  });

  it('explains that a wildcard with nothing readable reports every field as an unknown column', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain('is reported as `Unknown column`, even though the fields are fine');
  });

  it('notes that the rule runs with the owner API key, not the current user privileges', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain("**rule owner's** API key");
    expect(content).toContain('privileges as they were when the key was created');
  });

  it('says the tools run with the current user privileges and the agent has none of its own', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain('run with the privileges of the user in this conversation');
    expect(content).toContain('you have no privileges of your own');
    expect(content).toContain('never describe a check as using "your own access"');
  });

  it('treats a negative index check as inconclusive', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain('say whose access it reflects');
    expect(content).toContain('A missing index is inconclusive');
    expect(content).toContain('does not prove the rule owner can read it');
  });

  it('lists mapping problems as possible causes of unknown columns and type errors', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain('Mapping issue: the field is not mapped in any matched index');
    expect(content).toContain(
      'Mapping issue: the same field is mapped with different types across the indices'
    );
    expect(content).toContain('`.keyword` sub-field');
  });

  it('covers authorization and credential errors with their possible causes', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain('Authorization and credential errors');
    expect(content).toContain("The rule's API key is invalid, expired, or revoked");
    expect(content).toContain('The user who owns the rule was deleted or disabled');
  });

  it('tells the agent to verify with the index discovery tools before concluding', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain(platformCoreTools.listIndices);
    expect(content).toContain(platformCoreTools.getIndexMapping);
    expect(content).toContain('If you cannot verify a cause, say so');
  });

  it('covers recovery and no-data queries as separate queries with the same causes', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain('Recovery and no-data query failures');
    expect(content).toContain('every cause in A, B, and C');
  });

  it.each(['Too many groups', 'high-cardinality', 'A slow or overloaded cluster'])(
    'covers the "%s" cause for size and timeout failures',
    (cause) => {
      const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

      expect(content).toContain(cause);
    }
  );

  it('does not edit the rule when the cause is privileges, mappings, or the platform', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain(
      '(privileges, mappings, a missing index, server limits, platform errors)'
    );
    expect(content).toContain('Only change the rule when the cause is a rule definition problem');
  });

  it('never claims the rule was saved and points to the rendered Update Rule action', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain('Update Rule');
    expect(content).toContain('never claim the rule was saved');
  });

  it('is scoped to rule failures only, not action policies, notification workflows, or connectors', () => {
    const { content, description } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(description).toContain('only diagnoses rule failures');
    expect(description).toContain(
      'action policy failures, notification workflow failures and connector issues are out of scope'
    );
    expect(content).toContain(
      'Action policy failures, notification workflow failures, or connector issues'
    );
    expect(content).toContain('This skill only diagnoses **rule** failures');
    expect(content).toContain('do not guess a cause');
  });

  it.each(['A', 'B', 'C', 'D', 'E', 'F'])(
    'gives each cause in group %s a confirmation check and a possible fix',
    (group) => {
      const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());
      const [, afterHeading = ''] = content.split(`#### ${group}. `);
      const [section] = afterHeading.split('\n#### ');

      expect(section).toContain('- Confirm:');
      expect(section).toContain('- Possible fix (');
    }
  );

  it('labels each possible fix as a rule change or not a rule change', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain('Possible fix (rule change)');
    expect(content).toContain('Possible fix (not a rule change)');
    expect(content).not.toMatch(/^\s*- Fix[ :(]/m);
  });

  it('lists a column removed earlier in the query before blaming privileges for an unknown column', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain('The column was removed earlier in the query');
    expect(content).toContain('yet the rule still fails, and cause 5 does not apply');
  });

  it('lets the agent go beyond the listed causes and fixes when the evidence points elsewhere', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain('common cases, not a complete list');
    expect(content).toContain('If the evidence points to a different cause or a better fix');
    expect(content).toContain('Do not force the failure into one of the listed causes');
  });

  it('points to the rule-authoring skill for general composition guidance', () => {
    const { content } = createUniversalAlertingFailureDiagnosisSkill(createDeps());

    expect(content).toContain(RULE_AUTHORING_SKILL_ID);
  });
});

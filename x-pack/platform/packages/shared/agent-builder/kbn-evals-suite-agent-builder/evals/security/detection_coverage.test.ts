/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderEvaluationChatClient } from '../../src/chat_client';
import { COVERAGE_RULE_NAMES } from './detection_coverage_fixtures';

type VerdictTest = (fixtures: {
  chatClient: Pick<AgentBuilderEvaluationChatClient, 'converse'>;
}) => Promise<void>;

const mockVerdictTests = new Map<string, VerdictTest>();
let mockBeforeAll: (fixtures: {
  kbnClient: { request: jest.Mock };
  fetch: jest.Mock;
  connector: { id: string };
  log: { info: jest.Mock };
}) => Promise<void>;

jest.mock('../../src/evaluate', () => {
  const evaluate = Object.assign(
    (name: string, callback: VerdictTest) => mockVerdictTests.set(name, callback),
    {
      extend: () => evaluate,
      describe: (name: string, _options: unknown, callback: () => void) => {
        if (name === 'Security Skills - Detection Coverage verdicts') callback();
      },
      beforeAll: (callback: typeof mockBeforeAll) => {
        mockBeforeAll = callback;
      },
      afterAll: jest.fn(),
    }
  );
  return { evaluate };
});

jest.mock('@kbn/scout', () => ({
  tags: { serverless: { security: { complete: [], ease: [] } } },
}));
jest.mock('@kbn/agent-builder-common', () => ({ defaultAgentToolIds: [] }));
jest.mock('../../src/evaluate_dataset', () => ({ createEvaluateDataset: jest.fn() }));
jest.mock('./detection_coverage_fixtures', () => ({
  ...jest.requireActual('./detection_coverage_fixtures'),
  seedDetectionCoverageFixtures: jest.fn().mockResolvedValue({ cleanup: jest.fn() }),
}));

const nearMissNames = [
  'a same-technique sibling resolves to its own rule, not the other T1059 rule',
  'a request inside a narrow rule scope is covered, where the same ask outside it is not',
  'a different lateral-movement protocol is not covered by the disabled SMB rule',
];

const runVerdictTest = async (name: string, answer: string) => {
  const callback = mockVerdictTests.get(name);
  if (!callback) throw new Error(`Missing verdict test: ${name}`);
  const converse = jest.fn().mockResolvedValue({
    messages: [{ message: answer }],
    steps: [{ type: 'tool_call', tool_id: 'load_skill', params: { skill: 'detection-coverage' } }],
  });
  await callback({ chatClient: { converse } });
  return converse;
};

describe('detection coverage near-miss evals', () => {
  let coverageAgentId: string;

  beforeAll(async () => {
    await import('./detection_coverage.spec');
    const fetch = jest.fn();
    await mockBeforeAll({
      kbnClient: { request: jest.fn() },
      fetch,
      connector: { id: 'test-connector' },
      log: { info: jest.fn() },
    });
    coverageAgentId = JSON.parse(fetch.mock.calls[0][1].body).id;
  });

  const siblingAnswer = `covered_enabled: ${COVERAGE_RULE_NAMES.officeCmd} covers Office spawning cmd.exe. ${COVERAGE_RULE_NAMES.powershell} does not cover that behaviour.`;

  it('accepts the matching rule while explaining why the PowerShell rule does not match', async () => {
    await runVerdictTest(nearMissNames[0], siblingAnswer);
  });

  it('accepts an accurate answer that names both rules in one sentence', async () => {
    await runVerdictTest(
      nearMissNames[0],
      `covered_enabled: ${COVERAGE_RULE_NAMES.officeCmd} covers Office spawning cmd.exe, unlike ${COVERAGE_RULE_NAMES.powershell}.`
    );
  });

  it('accepts an accurate short contrast that names both rules in one clause', async () => {
    await runVerdictTest(
      nearMissNames[0],
      `covered_enabled: ${COVERAGE_RULE_NAMES.officeCmd} covers this, unlike ${COVERAGE_RULE_NAMES.powershell}.`
    );
  });

  it('rejects the inverse short contrast that credits the PowerShell sibling', async () => {
    await expect(
      runVerdictTest(
        nearMissNames[0],
        `covered_enabled: ${COVERAGE_RULE_NAMES.powershell} covers this, unlike ${COVERAGE_RULE_NAMES.officeCmd}.`
      )
    ).rejects.toThrow();
  });

  it('rejects an answer that credits the PowerShell sibling while naming the Office rule', async () => {
    await expect(
      runVerdictTest(
        nearMissNames[0],
        `covered_enabled: ${COVERAGE_RULE_NAMES.powershell} covers this behaviour; ${COVERAGE_RULE_NAMES.officeCmd} does not.`
      )
    ).rejects.toThrow();
  });

  it('rejects the same wrong attribution when the verdict stands alone', async () => {
    await expect(
      runVerdictTest(
        nearMissNames[0],
        `covered_enabled.\nThe covering rule is ${COVERAGE_RULE_NAMES.powershell}, and ${COVERAGE_RULE_NAMES.officeCmd} detects other behaviour.`
      )
    ).rejects.toThrow();
  });

  it.each([
    [nearMissNames[0], `covered_enabled: ${COVERAGE_RULE_NAMES.officeCmd}`],
    [nearMissNames[1], `covered_enabled: ${COVERAGE_RULE_NAMES.kubectlStaging}`],
    [nearMissNames[2], 'no_coverage'],
  ])('pins "%s" to the coverage agent', async (name, answer) => {
    const converse = await runVerdictTest(name, answer);
    expect(converse).toHaveBeenCalledWith(
      expect.objectContaining({ options: { agentId: coverageAgentId } })
    );
  });

  it('still rejects an answer naming only the nonmatching PowerShell rule', async () => {
    await expect(
      runVerdictTest(nearMissNames[0], `covered_enabled: ${COVERAGE_RULE_NAMES.powershell}`)
    ).rejects.toThrow();
  });

  it('still rejects the wrong verdict even when the matching rule is named', async () => {
    await expect(
      runVerdictTest(nearMissNames[0], `no_coverage: ${COVERAGE_RULE_NAMES.officeCmd}`)
    ).rejects.toThrow();
  });
});

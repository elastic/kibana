/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type {
  LlmSmokeFailureEvidence,
  LlmSmokeFailureJudgement,
} from '@kbn/gen-ai-functional-testing';
import { judgeLlmSmokeFailure, recordLlmSmokeJudgement } from '@kbn/gen-ai-functional-testing';

/**
 * Judges a smoke-test failure via backup EIS inference endpoints (bypassing Kibana),
 * records the judgement for CI monitoring, and returns the verdict. Never throws:
 * when the judge itself is unavailable the verdict is `unknown`, preserving the
 * original test failure.
 */
export const triageLlmSmokeFailure = async ({
  esClient,
  evidence,
  judgeInferenceIds,
  ensureJudgeReady,
}: {
  esClient: Client;
  evidence: LlmSmokeFailureEvidence;
  judgeInferenceIds: string[];
  ensureJudgeReady: () => Promise<void>;
}): Promise<LlmSmokeFailureJudgement> => {
  let judgement: LlmSmokeFailureJudgement;
  try {
    await ensureJudgeReady();
    judgement = await judgeLlmSmokeFailure({ esClient, evidence, judgeInferenceIds });
  } catch (error) {
    judgement = {
      verdict: 'unknown',
      reason: `judge unavailable: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  recordLlmSmokeJudgement(evidence, judgement);
  process.stdout.write(
    `[LLM-SMOKE-JUDGE] target=${evidence.target} scenario=${evidence.scenario} verdict=${
      judgement.verdict
    } judge=${judgement.judgeInferenceId ?? 'none'} reason=${judgement.reason}\n`
  );
  return judgement;
};

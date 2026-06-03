import type { ScoutTestOptions } from '@kbn/scout';
import type { PlaywrightTestConfig } from '@playwright/test';
import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
export interface EvaluationTestOptions extends ScoutTestOptions {
    connector: AvailableConnectorWithId;
    evaluationConnector: AvailableConnectorWithId;
    repetitions: number;
    timeout?: number;
}
/**
 * Exports a Playwright configuration specifically for offline evals
 */
export declare function createPlaywrightEvalsConfig({ testDir, testIgnore, repetitions, timeout, runGlobalSetup, }: {
    testDir: string;
    testIgnore?: PlaywrightTestConfig['testIgnore'];
    repetitions?: number;
    timeout?: number;
    runGlobalSetup?: boolean;
}): PlaywrightTestConfig<{}, EvaluationTestOptions>;

import type { RegexAnonymizationRule } from '@kbn/inference-common';
import type { DetectedMatch } from './types';
import type { RegexWorkerService } from './regex_worker_service';
/**
 * Executes multiple regex anonymization rules, detecting all matches in the original text
 * without modifying it. Returns match positions and values for later processing.
 */
export declare function executeRegexRules({ records, rules, regexWorker, }: {
    records: Array<Record<string, string>>;
    rules: RegexAnonymizationRule[];
    regexWorker: RegexWorkerService;
}): Promise<DetectedMatch[]>;

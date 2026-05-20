import type { NamedEntityRecognitionRule } from '@kbn/inference-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AnonymizationState } from './types';
/**
 * Executes a NER anonymization rule, by:
 *
 * - For each record, iterate over the key-value pairs.
 * - Split up each value in strings < MAX_TOKENS_PER_DOC, to stay within token limits
 * for NER tasks.
 * - Push each part to an array of strings, track the position in the array, so we can
 * reconstruct the records later.
 * - Create a {text_field:string} document for each part, and run NER inference over
 * these documents in batches.
 * - After retrieving the results:
 *  - Iterate over the _input_ and find the inferred results by key + position
 *  - For each detected entity, replace with a mask
 *  - Append the original value & masked value to `state.anonymizations`
 *  - Return the text with the masked values
 *  - Reconstruct the original record
 */
export declare function executeNerRule({ state, rule, esClient, salt, }: {
    state: AnonymizationState;
    rule: NamedEntityRecognitionRule;
    esClient: ElasticsearchClient;
    salt?: string;
}): Promise<AnonymizationState>;

import { type DissectProcessor, type GrokProcessor, type StreamlangDSL } from '@kbn/streamlang';
/**
 * Prepends a server-selected grok/dissect processor to the agent's suggested pipeline and
 * re-assigns step identifiers. Use at the orchestration layer only — `suggestProcessingPipeline`
 * does not receive the seed parser.
 */
export declare function mergeSeedParsingProcessorIntoSuggestedPipeline(seedParsingProcessor: GrokProcessor | DissectProcessor, agentSuggestedPipeline: StreamlangDSL): StreamlangDSL;

import type { DissectProcessor, GrokProcessor } from '@kbn/streamlang';
/**
 * Human-readable block for the suggestion prompt: describes the system-managed grok/dissect
 * that already ran so samples match that shape. Not a processor the agent should recreate.
 */
export declare function formatUpstreamSeedParsingContextForPromptMarkdown(processor: GrokProcessor | DissectProcessor): string;

import type { monaco } from '@kbn/monaco';
import type { JsonValue } from '@kbn/utility-types';
import type { ProcessorSuggestionsResponse } from '@kbn/streams-plugin/common';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
export declare const serializeXJson: (v: unknown, defaultVal?: string) => string;
export declare const deserializeJson: (input: string) => any;
export declare const parseXJsonOrString: (input: string) => unknown;
export declare const fetchProcessorSuggestions: (streamsRepositoryClient: StreamsRepositoryClient, signal: AbortSignal) => Promise<ProcessorSuggestionsResponse>;
export declare const hasOddQuoteCount: (text: string) => boolean;
export declare const buildProcessorInsertText: (name: string, template: JsonValue | undefined, alreadyOpenedQuote: boolean) => string;
export declare const buildPropertyInsertText: (propertyName: string, propertyTemplate: JsonValue | undefined, isQuoteOpen: boolean) => string;
export declare const detectProcessorContext: (model: monaco.editor.ITextModel, position: monaco.Position, knownProcessors: string[]) => {
    kind: "processorKey" | "processorProperty";
    processorName?: string;
};
export declare const shouldSuggestProcessorKey: (lineBeforeCursor: string, nearbyContextBeforeCursor: string) => boolean;

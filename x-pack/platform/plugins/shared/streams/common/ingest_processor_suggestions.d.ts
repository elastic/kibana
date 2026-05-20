import type { JsonValue } from '@kbn/utility-types';
export interface ProcessorSuggestion {
    name: string;
    template?: JsonValue;
}
export interface ProcessorPropertySuggestion {
    name: string;
    template?: JsonValue;
}
export interface ProcessorSuggestionsResponse {
    processors: ProcessorSuggestion[];
    propertiesByProcessor: Record<string, ProcessorPropertySuggestion[]>;
}

import type { ConsoleStart } from '@kbn/console-plugin/server';
import type { ProcessorSuggestion, ProcessorSuggestionsResponse } from '../../../../common';
export declare class ProcessorSuggestionsService {
    private fetcher;
    constructor();
    setConsoleStart(consoleStart: ConsoleStart): void;
    getSuggestions(): Promise<ProcessorSuggestion[]>;
    private buildSuggestions;
    private buildPropertiesByProcessor;
    private extractTemplateFromRule;
    private normalizeToJsonValue;
    getAllSuggestions(): Promise<ProcessorSuggestionsResponse>;
}

import { type EsqlDocData, type EsqlPrompts } from './load_data';
import type { GetDocsOptions } from './types';
export declare class EsqlDocumentBase {
    private prompts;
    private docRecords;
    static load(): Promise<EsqlDocumentBase>;
    constructor(rawData: EsqlDocData);
    getPrompts(): EsqlPrompts;
    /** @deprecated use individual prompts instead */
    getSystemMessage(): string;
    getDocumentation(rawKeywords: string[], { generateMissingKeywordDoc, addSuggestions, resolveAliases, }?: GetDocsOptions): Record<string, string>;
}

export interface EsqlDocEntry {
    keyword: string;
    data: string;
}
export interface EsqlPrompts {
    syntax: string;
    instructions: string;
    examples: string;
}
export interface EsqlDocData {
    prompts: EsqlPrompts;
    docs: Record<string, EsqlDocEntry>;
}
export declare const loadData: () => Promise<EsqlDocData>;

import type { ParsedTemplateEntry } from './use_parse_yaml';
interface ImportResult {
    created: number;
    updated: number;
    failed: number;
    errors: Array<{
        templateName: string;
        error: string;
    }>;
}
export declare const useImportTemplates: () => {
    importTemplates: (templates: ParsedTemplateEntry[]) => Promise<ImportResult>;
    isImporting: boolean;
};
export {};

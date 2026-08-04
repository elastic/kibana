import { MessageImporter } from '@kbn/file-upload-plugin/public';
import type { HttpSetup } from '@kbn/core/public';
import type { FindFileStructureResponse, ImportFactoryOptions } from '@kbn/file-upload-common';
export declare const LINE_LIMIT = 5;
type HighlightedLine = Array<{
    word: string;
    field?: {
        type: string;
        name: string;
    };
}>;
export declare class GrokHighlighter extends MessageImporter {
    private http;
    constructor(options: ImportFactoryOptions, http: HttpSetup);
    createLines(text: string, grokPattern: string, mappings: FindFileStructureResponse['mappings'], ecsCompatibility: string | undefined): Promise<HighlightedLine[]>;
    private testGrokPattern;
}
export {};

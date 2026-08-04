import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';
/**
 * Converts templates (already parsed on the server) into a multi-document YAML string for download.
 * Best-effort reconstruction: it does not preserve the original author's exact formatting/comments,
 * but the data round-trips losslessly through the import parser.
 */
export declare const templatesToYaml: (templates: ParsedTemplate[]) => string;
export declare const templateToYaml: (template: ParsedTemplate) => string;

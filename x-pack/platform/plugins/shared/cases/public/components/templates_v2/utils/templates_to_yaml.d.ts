import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';
/**
 * Converts templates (already parsed on the server) into a YAML string suitable for download.
 *
 * NOTE: This is a best-effort YAML reconstruction. It does not guarantee a lossless round-trip
 * of the original author-provided YAML formatting.
 */
export declare const templatesToYaml: (templates: ParsedTemplate[]) => string;
export declare const templateToYaml: (template: ParsedTemplate) => string;

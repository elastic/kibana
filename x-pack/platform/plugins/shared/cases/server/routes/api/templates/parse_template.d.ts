import type { Template, ParsedTemplate } from '../../../../common/types/domain/template/v1';
/**
 * Parse a raw template definition (YAML string) into a ParsedTemplate
 * NOTE: this will be moved to a service / domain layer or even the schema itself
 */
export declare const parseTemplate: (template: Template) => ParsedTemplate;

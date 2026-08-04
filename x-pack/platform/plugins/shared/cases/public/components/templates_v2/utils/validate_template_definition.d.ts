export type TemplateDefinitionValidationResult = {
    success: true;
} | {
    success: false;
    message: string;
};
/**
 * Editor-only completeness check: the YAML must always contain the case-default keys plus the
 * `fields` block (the shared REQUIRED_TEMPLATE_ROOT_KEYS), so the YAML stays a complete
 * representation of the render panel's YAML-backed sections. Removing any of them surfaces here as
 * an error. This is intentionally NOT enforced by the runtime schema, which stays lenient for
 * back-compat. `settings`/`connector` are excluded — they are panel-owned and must never gate the
 * preview (see REQUIRED_TEMPLATE_ROOT_KEYS).
 */
export declare const getMissingRequiredKeys: (definition: Record<string, unknown>) => string[];
export declare const validateTemplateDefinitionYaml: (definition: string) => TemplateDefinitionValidationResult;

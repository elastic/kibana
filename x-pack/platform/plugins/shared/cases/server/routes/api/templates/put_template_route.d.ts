/**
 * PUT /internal/cases/templates/{template_id}
 * Full update of a template (creates a new version)
 */
export declare const putTemplateRoute: import("../types").CaseRoute<Readonly<{} & {
    template_id: string;
}>, unknown, unknown>;

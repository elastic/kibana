export interface CasesUiCapabilities {
    all: readonly string[];
    read: readonly string[];
    delete: readonly string[];
    settings: readonly string[];
    reopenCase: readonly string[];
    createComment: readonly string[];
    assignCase: readonly string[];
    manageTemplates: readonly string[];
}
/**
 * Return the UI capabilities for each type of operation. These strings must match the values defined in the UI
 * here: x-pack/platform/plugins/shared/cases/public/client/helpers/capabilities.ts
 */
export declare const createUICapabilities: () => CasesUiCapabilities;

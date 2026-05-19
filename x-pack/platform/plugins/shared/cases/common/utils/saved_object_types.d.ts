interface CasesConfigType {
    templates?: {
        enabled?: boolean;
    };
    attachments?: {
        enabled?: boolean;
    };
}
/**
 * If more values are added here please also add them here: x-pack/test/cases_api_integration/common/plugins
 */
export declare const getSavedObjectsTypes: (config?: Partial<CasesConfigType>) => string[];
export {};

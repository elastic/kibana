import type { SecurityPluginStart } from '@kbn/security-plugin/public';
interface UseUserPickerValidatorsParams {
    isRequired: boolean;
    security: SecurityPluginStart;
}
export declare const useUserPickerValidators: ({ isRequired, security }: UseUserPickerValidatorsParams) => ({
    validator: ({ value }: {
        value: unknown;
    }) => {
        message: string;
    } | undefined;
} | {
    validator: ({ value }: {
        value: unknown;
    }) => Promise<{
        message: string;
    } | undefined>;
})[];
export {};

import type { SecurityPluginStart } from '@kbn/security-plugin/public';
interface UseUserPickerValidatorsParams {
    isRequired: boolean;
    security: SecurityPluginStart;
}
type ValidateFn = (value: unknown) => true | string | Promise<true | string>;
export declare const useUserPickerValidators: ({ isRequired, security, }: UseUserPickerValidatorsParams) => {
    validate: Record<string, ValidateFn>;
};
export {};

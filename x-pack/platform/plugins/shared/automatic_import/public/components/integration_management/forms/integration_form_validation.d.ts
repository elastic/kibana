import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { IntegrationFormData } from './types';
export declare const REQUIRED_FIELDS: string[];
/**
 * Create the form schema for integration management
 *
 * @param packageNames - Set of existing package names for uniqueness validation
 * @param currentIntegrationTitle - For existing integrations, their current title to exclude from uniqueness check
 * @param existingDataStreamTitles - Set of existing data stream titles for uniqueness validation (case-insensitive)
 * @returns The form schema with appropriate validations
 */
export declare const createFormSchema: (packageNames?: Set<string>, currentIntegrationTitle?: string, existingDataStreamTitles?: Set<string>) => FormSchema<IntegrationFormData>;

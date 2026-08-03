import type { RuleResponse, CreateRuleData, UpdateRuleData } from '@kbn/alerting-v2-schemas';
import type { FormValues } from '../../form/types';
export declare const composeFormToCreateRequest: (formValues: FormValues, builderType?: string) => CreateRuleData;
export declare const composeFormToUpdateRequest: (formValues: FormValues, builderType?: string) => UpdateRuleData;
/** Bridge YAML parse output into compose form values for the Discover flyout. */
export declare const mapYamlFormValuesToComposeFormValues: (parsed: FormValues) => FormValues;
export declare const mapRuleToComposeFormValues: (rule: RuleResponse) => FormValues;

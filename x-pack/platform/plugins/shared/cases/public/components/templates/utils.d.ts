import type { ActionConnector, TemplateConfiguration } from '../../../common/types/domain';
import type { CasesConfigurationUI, CaseUI } from '../../containers/types';
import type { TemplateFormProps } from './types';
export declare function removeEmptyFields<T extends Record<string, unknown>>(obj: T): Partial<T>;
export declare const convertTemplateCustomFields: (customFields?: CaseUI["customFields"]) => Record<string, string | boolean> | null;
export declare const templateDeserializer: (data: TemplateConfiguration) => TemplateFormProps;
export declare const templateSerializer: (connectors: ActionConnector[], currentConfiguration: CasesConfigurationUI, data: TemplateFormProps) => TemplateConfiguration;

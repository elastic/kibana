import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { USER_SETTINGS_TEMPLATE_SUFFIX } from '../../../../constants';
type TemplateBaseName = string;
type UserSettingsTemplateName = `${TemplateBaseName}${typeof USER_SETTINGS_TEMPLATE_SUFFIX}`;
export declare const isUserSettingsTemplate: (name: string) => name is UserSettingsTemplateName;
export declare const fillConstantKeywordValues: (oldMappings: MappingTypeMapping, newMappings: MappingTypeMapping) => MappingTypeMapping;
export {};

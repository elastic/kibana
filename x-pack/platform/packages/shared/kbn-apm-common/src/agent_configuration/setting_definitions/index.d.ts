import type { AgentName } from '@kbn/elastic-agent-utils';
import type { SettingDefinition } from './types';
export declare function filterByAgent(agentName?: AgentName): (setting: SettingDefinition) => boolean;
export declare function validateSetting(setting: SettingDefinition, value: unknown): {
    isValid: boolean;
    message: string | undefined;
};
export declare const settingDefinitions: SettingDefinition[];

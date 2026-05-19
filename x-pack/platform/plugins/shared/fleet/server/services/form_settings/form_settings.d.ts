import { type Props } from '@kbn/config-schema';
import type { SettingsConfig, SettingsSection } from '../../../common/settings/types';
import type { AgentPolicy } from '../../types';
export declare function getSettingsAPISchema(settingSection: SettingsSection): Props;
export declare function _getSettingsAPISchema(settings: SettingsConfig[]): Props;
export declare function getSettingsValuesForAgentPolicy(settingSection: SettingsSection, agentPolicy: AgentPolicy): {
    [k: string]: any;
};
export declare function _getSettingsValuesForAgentPolicy(settings: SettingsConfig[], agentPolicy: AgentPolicy): {
    [k: string]: any;
};
export declare function getSettings(settingSection: SettingsSection): SettingsConfig[];

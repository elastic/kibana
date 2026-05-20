import React from 'react';
import type { SettingsConfig } from '../../../../../common/settings/types';
export declare const settingComponentRegistry: Map<string, (settingsconfig: SettingsConfig & {
    disabled?: boolean;
}) => React.ReactElement>;
export declare function ConfiguredSettings({ configuredSettings, disabled, }: {
    configuredSettings: SettingsConfig[];
    disabled?: boolean;
}): React.JSX.Element;

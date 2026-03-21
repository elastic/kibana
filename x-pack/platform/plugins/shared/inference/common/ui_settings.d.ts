import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
export declare function getUiSettings({ anonymizationEnabled, }: {
    anonymizationEnabled: boolean;
}): Record<string, UiSettingsParams>;

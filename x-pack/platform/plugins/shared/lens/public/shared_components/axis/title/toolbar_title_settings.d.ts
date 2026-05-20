import React from 'react';
import type { AxesSettingsConfig } from '@kbn/lens-common';
type SettingsConfigKeys = keyof AxesSettingsConfig | 'legend';
export interface TitleSettingsProps {
    /**
     * Determines the settingId - either axis or legend
     */
    settingId: SettingsConfigKeys;
    /**
     * Determines the title
     */
    title: string | undefined;
    /**
     * Callback to title change for both title and visibility
     */
    updateTitleState: (state: {
        title?: string;
        visible: boolean;
    }, settingId: SettingsConfigKeys) => void;
    /**
     * Determines if the title visibility switch is on and the input text is disabled
     */
    isTitleVisible: boolean;
    strings?: {
        header: string;
        label: string;
        getDataTestSubj: (axis: SettingsConfigKeys) => string;
    };
    placeholder?: string;
}
export declare const ToolbarTitleSettings: React.FunctionComponent<TitleSettingsProps>;
export {};

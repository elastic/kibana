import React from 'react';
interface Props {
    disabled: boolean;
    isSynced?: boolean;
    showLabel?: boolean;
    onSwitchChange?: (isSynced: boolean) => void;
}
export declare const SyncAlertsSwitch: React.NamedExoticComponent<Props>;
export {};

import React from 'react';
interface Props {
    isDisabled?: boolean;
    withSysMonitoring: boolean;
    updateSysMonitoring: (newValue: boolean) => void;
}
export declare const AgentPolicyFormSystemMonitoringCheckbox: React.FunctionComponent<Props>;
export {};

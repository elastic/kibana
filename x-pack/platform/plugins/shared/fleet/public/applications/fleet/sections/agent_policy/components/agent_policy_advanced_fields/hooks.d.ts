import React from 'react';
import type { NewAgentPolicy, AgentPolicy } from '../../../../types';
export declare const DEFAULT_SELECT_VALUE = "@@##DEFAULT_SELECT##@@";
export declare function useOutputOptions(agentPolicy: Partial<NewAgentPolicy | AgentPolicy>): {
    dataOutputOptions: {
        inputDisplay: string | React.JSX.Element;
        value: string;
        disabled: boolean | undefined;
    }[];
    monitoringOutputOptions: {
        inputDisplay: string | React.JSX.Element;
        value: string;
        disabled: boolean | undefined;
    }[];
    dataOutputValueOfSelected: string;
    isLoading: boolean;
};
export declare function useDownloadSourcesOptions(): {
    dataDownloadSourceOptions: ({
        inputDisplay: string | React.JSX.Element;
        value: string;
        disabled: boolean | undefined;
    } | {
        value: string;
        inputDisplay: string;
    })[];
    isLoading: boolean;
};
export declare function useFleetServerHostsOptions(agentPolicy: Partial<NewAgentPolicy | AgentPolicy>): {
    fleetServerHostsOptions: ({
        inputDisplay: string | React.JSX.Element;
        value: string;
        disabled: boolean | undefined;
    } | {
        value: string;
        inputDisplay: string;
    })[];
    isLoading: boolean;
};

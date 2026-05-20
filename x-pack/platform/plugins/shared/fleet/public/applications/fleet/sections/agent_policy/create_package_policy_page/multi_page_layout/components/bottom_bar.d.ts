import React from 'react';
export declare const NotObscuredByBottomBar: import("styled-components").StyledComponent<"div", any, {}, never>;
export declare const CreatePackagePolicyBottomBar: React.FC<{
    isLoading?: boolean;
    isDisabled?: boolean;
    cancelClickHandler?: React.ReactEventHandler;
    cancelUrl?: string;
    cancelMessage?: React.ReactElement;
    actionMessage: React.ReactElement;
    onNext: () => void;
    noAnimation?: boolean;
    loadingMessage?: React.ReactElement;
}>;
export declare const AgentStandaloneBottomBar: React.FC<{
    cancelClickHandler?: React.ReactEventHandler;
    cancelUrl?: string;
    onNext: () => void;
    noAnimation?: boolean;
}>;
export declare const CreatePackagePolicyFinalBottomBar: React.FC<{
    pkgkey: string;
}>;
export declare const AgentDataTimedOutBottomBar: React.FC<{
    troubleshootLink: string;
    agentIds: string[];
    integration?: string;
}>;

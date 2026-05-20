import React from 'react';
export declare enum CREATE_STATUS {
    INITIAL = "initial",
    CREATED = "created",
    FAILED = "failed"
}
export interface AgentPolicyCreateState {
    status: CREATE_STATUS;
    errorMessage?: JSX.Element;
}
interface Props {
    createState: AgentPolicyCreateState;
}
export declare const AgentPolicyCreatedCallOut: React.FunctionComponent<Props>;
export {};

import React from 'react';
import type { Agent, AgentPolicy } from '../../../../../types';
export interface AgentLogsProps {
    agent: Agent;
    agentPolicy?: AgentPolicy;
    state: AgentLogsState;
}
export interface AgentLogsState {
    start: string;
    end: string;
    logLevels: string[];
    datasets: string[];
    query: string;
}
export declare const AgentLogsUrlStateHelper: {
    Provider: React.Provider<import("@kbn/kibana-utils-plugin/public").StateContainer<any, any, {}>>;
    Consumer: React.Consumer<import("@kbn/kibana-utils-plugin/public").StateContainer<any, any, {}>>;
    context: React.Context<import("@kbn/kibana-utils-plugin/public").StateContainer<any, any, {}>>;
    useContainer: () => import("@kbn/kibana-utils-plugin/public").StateContainer<any, any, {}>;
    useState: () => any;
    useTransitions: () => Readonly<import("@kbn/kibana-utils-plugin/common/state_containers").PureTransitionsToTransitions<any>>;
    useSelector: <Result>(selector: (state: any) => Result, comparator?: import("@kbn/kibana-utils-plugin/public").Comparator<Result>) => Result;
    connect: import("@kbn/kibana-utils-plugin/public").Connect<any>;
};
export declare const AgentLogsUI: React.FunctionComponent<AgentLogsProps>;

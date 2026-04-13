import { type ActorRefFrom, type SnapshotFrom } from 'xstate';
import { type StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import type { YamlModeContext, YamlModeInput } from './types';
export type YamlModeActorRef = ActorRefFrom<typeof yamlModeMachine>;
export type YamlModeSnapshot = SnapshotFrom<typeof yamlModeMachine>;
export declare const yamlModeMachine: import("xstate").StateMachine<YamlModeContext, {
    type: "yaml.contentChanged";
    streamlangDSL: StreamlangDSL;
    yaml: string;
} | {
    type: "yaml.runSimulation";
    stepIdBreakpoint?: string;
} | {
    type: "dataSource.activeChanged";
    simulationMode: import("../data_source_state_machine").DataSourceSimulationMode;
}, {}, never, {
    type: "updateDSL";
    params: {
        streamlangDSL: StreamlangDSL;
        yaml: string;
    };
} | {
    type: "sendDSLToParent";
    params: unknown;
} | {
    type: "setActiveDataSource";
    params: {
        simulationMode: YamlModeContext["simulationMode"];
    };
} | {
    type: "sendStepsToSimulator";
    params: {
        stepIdBreakpoint?: string;
    } | undefined;
}, {
    type: "hasSimulatePrivileges";
    params: unknown;
} | {
    type: "canSimulate";
    params: unknown;
} | {
    type: "hasStagedChanges";
    params: unknown;
}, never, "editing", string, YamlModeInput, import("xstate").NonReducibleUnknown, import("xstate").EventObject, import("xstate").MetaObject, {
    id: "yamlMode";
    states: {
        readonly editing: {};
    };
}>;

import type { AdditiveChangesResult, StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { StreamlangDSL } from '@kbn/streamlang/types/streamlang';
import type { StreamPrivileges } from '../stream_enrichment_state_machine/types';
import type { DataSourceSimulationMode } from '../data_source_state_machine';
interface YamlModeParentSnapshot {
    context: {
        schemaErrors: string[];
        validationErrors: Map<string, unknown>;
    };
}
export interface YamlModeContext {
    nextStreamlangDSL: StreamlangDSL;
    previousStreamlangDSL: StreamlangDSL;
    additiveChanges: AdditiveChangesResult;
    parentRef: YamlModeParentActor;
    privileges: StreamPrivileges;
    simulationMode: DataSourceSimulationMode;
}
export interface YamlModeParentActor {
    getSnapshot(): YamlModeParentSnapshot;
    send: (event: YamlModeToParentEvent) => void;
}
type YamlModeToParentEvent = {
    type: 'mode.dslUpdated';
    dsl: StreamlangDSL;
} | {
    type: 'simulation.reset';
} | {
    type: 'simulation.updateSteps';
    steps: StreamlangStepWithUIAttributes[];
};
export interface YamlModeInput {
    previousStreamlangDSL: StreamlangDSL;
    nextStreamlangDSL: StreamlangDSL;
    parentRef: YamlModeParentActor;
    privileges: StreamPrivileges;
    simulationMode: DataSourceSimulationMode;
}
export type YamlModeEvent = {
    type: 'yaml.contentChanged';
    streamlangDSL: StreamlangDSL;
    yaml: string;
} | {
    type: 'yaml.runSimulation';
    stepIdBreakpoint?: string;
} | {
    type: 'dataSource.activeChanged';
    simulationMode: DataSourceSimulationMode;
};
export {};

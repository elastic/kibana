import type { FlattenRecord } from '@kbn/streams-schema';
import type { StreamsRepositoryClient } from '@kbn/streams-plugin/public/api';
import type { StreamlangStepWithUIAttributes } from '@kbn/streamlang';
import type { SimulationMachineDeps } from './types';
import type { SchemaField } from '../../../schema_editor/types';
export interface SimulationRunnerInput {
    streamName: string;
    detectedFields?: SchemaField[];
    documents: FlattenRecord[];
    steps: StreamlangStepWithUIAttributes[];
}
export declare function createSimulationRunnerActor({ streamsRepositoryClient, }: Pick<SimulationMachineDeps, 'streamsRepositoryClient'>): import("xstate").PromiseActorLogic<import("@kbn/streams-schema").ProcessingSimulationResponse, SimulationRunnerInput, import("xstate").EventObject>;
export declare const simulateProcessing: ({ streamsRepositoryClient, input, signal, }: {
    streamsRepositoryClient: StreamsRepositoryClient;
    input: SimulationRunnerInput;
    signal?: AbortSignal | null;
}) => Promise<import("@kbn/streams-schema").ProcessingSimulationResponse>;
export declare function createSimulationRunFailureNotifier({ toasts, }: Pick<SimulationMachineDeps, 'toasts'>): (params: {
    event: unknown;
}) => void;

import type { ActionsByType } from './execution_plan/types';
import type { PrintableStream, StreamActiveRecord } from './stream_active_record/stream_active_record';
import type { StateDependencies, StreamChange } from './types';
interface Changes {
    created: string[];
    updated: string[];
    deleted: string[];
}
interface ValidDryRunResult {
    status: 'valid_dry_run';
    changes: Changes;
    elasticsearchActions: ActionsByType;
}
type AttemptChangesResult = ValidDryRunResult | {
    status: 'success';
    changes: Changes;
};
/**
 * The State class is responsible for moving from the current state to the desired state
 * Based on the requested bulk changes. It follows the following phases to achieve this:
 * 1. Load the current state by reading all the stored Stream definitions
 * 2. Applying the requested changes to a clone of the current state (by showing the change to each Stream instance)
 * 3. Applying cascading changes that the Stream instances return in response to a requested change
 * 4. Validating the desired state by asking each Stream if it is valid in this state
 * 5. If the state is valid, State asks each Stream to determine the required Elasticsearch actions needed to reach the desired state
 * 6. If it is a dry run, it returns the affected streams and the Elasticsearch actions that would have happened
 * 7. If it is a real run, it commits the changes by updating the various Elasticsearch resources (delegated to the ExecutionPlan class)
 * 8. If this fails, it throws an error and guides the user to use resync if needed
 */
export declare class State {
    private streamsByName;
    private dependencies;
    private constructor();
    clone(): State;
    static attemptChanges(requestedChanges: StreamChange[], dependencies: StateDependencies, dryRun?: boolean): Promise<AttemptChangesResult>;
    static resync(dependencies: StateDependencies): Promise<void>;
    static currentState(dependencies: StateDependencies): Promise<State>;
    applyChanges(requestedChanges: StreamChange[]): Promise<State>;
    applyRequestedChange(requestedChange: StreamChange, desiredState: State, startingState: State): Promise<void>;
    applyCascadingChanges(cascadingChanges: StreamChange[], desiredState: State, startingState: State): Promise<void>;
    applyChange(change: StreamChange, desiredState: State, startingState: State): Promise<StreamChange[]>;
    validate(startingState: State): Promise<void>;
    commitChanges(startingState: State): Promise<void>;
    determineElasticsearchActions(changedStreams: StreamActiveRecord[], desiredState: State, startingState: State): Promise<import("./execution_plan/types").ElasticsearchAction[]>;
    changedStreams(): StreamActiveRecord<import("@kbn/streams-schema").Streams.all.Definition>[];
    plannedActions(startingState: State): Promise<ActionsByType>;
    changes(startingState: State): Changes;
    get(name: string): StreamActiveRecord<import("@kbn/streams-schema").Streams.all.Definition> | undefined;
    set(name: string, stream: StreamActiveRecord): void;
    all(): StreamActiveRecord<import("@kbn/streams-schema").Streams.all.Definition>[];
    has(name: string): boolean;
    toPrintable(): Record<string, PrintableStream>;
}
export {};

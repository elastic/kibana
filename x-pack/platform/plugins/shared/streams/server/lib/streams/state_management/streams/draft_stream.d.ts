import { Streams } from '@kbn/streams-schema';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type { StateDependencies } from '../types';
import type { StreamActiveRecord } from '../stream_active_record/stream_active_record';
import { WiredStream } from './wired_stream';
/**
 * Handles wired streams that are in draft mode (`draft: true`).
 *
 * Draft streams exist only as a `.streams` document and an ES|QL view —
 * they have no backing data stream, component/index templates, or ingest
 * pipelines. When a draft is materialized (updated with `draft: false`),
 * it delegates to the parent WiredStream's full create logic.
 */
export declare class DraftStream extends WiredStream {
    protected doClone(): StreamActiveRecord<Streams.WiredStream.Definition>;
    protected doDetermineCreateActions(desiredState: State): Promise<ElasticsearchAction[]>;
    protected doDetermineUpdateActions(desiredState: State, startingState: State, startingStateStream: WiredStream): Promise<ElasticsearchAction[]>;
    protected doDetermineDeleteActions(): Promise<ElasticsearchAction[]>;
    private getRoutingInfoFromParent;
    static create(definition: Streams.WiredStream.Definition, dependencies: StateDependencies): DraftStream;
}

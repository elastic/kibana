import type { SomeDevLog } from '@kbn/some-dev-log';
import type { Model } from '@kbn/inference-common';
import type { EvalsExecutorClient, Evaluator, EvaluationDataset, EvaluationDatasetWithId, ExperimentTask, OnEvaluationComplete, RanExperiment, TaskOutput } from '../types';
export declare class KibanaEvalsClient implements EvalsExecutorClient {
    private readonly options;
    private readonly experiments;
    constructor(options: {
        log: SomeDevLog;
        model: Model;
        runId: string;
        repetitions?: number;
        upsertDataset?: (dataset: EvaluationDataset) => Promise<void>;
        getDatasetByName?: (datasetName: string) => Promise<EvaluationDataset | EvaluationDatasetWithId | null>;
        onEvaluationComplete?: OnEvaluationComplete;
    });
    private resolveDataset;
    runExperiment<TEvaluationDataset extends EvaluationDataset, TTaskOutput extends TaskOutput = TaskOutput>({ dataset, task, metadata: experimentMetadata, concurrency, trustUpstreamDataset, }: {
        dataset: TEvaluationDataset;
        metadata?: Record<string, unknown>;
        task: ExperimentTask<TEvaluationDataset['examples'][number], TTaskOutput>;
        concurrency?: number;
        trustUpstreamDataset?: boolean;
    }, evaluators: Array<Evaluator<TEvaluationDataset['examples'][number], TTaskOutput>>): Promise<RanExperiment>;
    getRanExperiments(): Promise<RanExperiment[]>;
}

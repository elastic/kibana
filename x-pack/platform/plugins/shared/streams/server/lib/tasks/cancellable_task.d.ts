import type { RunContext } from '@kbn/task-manager-plugin/server';
import type { RunFunction } from '@kbn/task-manager-plugin/server/task';
import type { TaskContext } from './task_definitions';
export declare function cancellableTask(run: RunFunction, runContext: RunContext, taskContext: TaskContext): () => Promise<import("@kbn/task-manager-plugin/server/task").AnyRunResult>;

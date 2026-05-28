import type { ConcreteTaskInstance } from '../../task';
import type { TaskClaimingBatches } from '../../queries/task_claiming';
import { type TaskTypeDictionary } from '../../task_type_dictionary';
interface SelectTasksByCapacityOpts {
    definitions: TaskTypeDictionary;
    tasks: ConcreteTaskInstance[];
    batches: TaskClaimingBatches;
}
export declare function selectTasksByCapacity({ definitions, tasks, batches, }: SelectTasksByCapacityOpts): ConcreteTaskInstance[];
export {};

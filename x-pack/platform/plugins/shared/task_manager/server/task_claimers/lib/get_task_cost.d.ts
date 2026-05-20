import type { ConcreteTaskInstance } from '../../task';
import type { TaskTypeDictionary } from '../../task_type_dictionary';
export declare function getTaskCost(task: ConcreteTaskInstance, definitions: TaskTypeDictionary): number;

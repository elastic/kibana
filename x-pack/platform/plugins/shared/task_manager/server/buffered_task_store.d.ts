import type { TaskStore } from './task_store';
import type { ConcreteTaskInstance, PartialConcreteTaskInstance } from './task';
import type { Updatable } from './task_running';
import type { BufferOptions } from './lib/bulk_operation_buffer';
export declare class BufferedTaskStore implements Updatable {
    private readonly taskStore;
    private bufferedPartialUpdate;
    private bufferedUpdate;
    private bufferedRemove;
    constructor(taskStore: TaskStore, options: BufferOptions);
    update(doc: ConcreteTaskInstance, options: {
        validate: boolean;
    }): Promise<ConcreteTaskInstance>;
    partialUpdate(partialDoc: PartialConcreteTaskInstance, options: {
        validate: boolean;
        doc: ConcreteTaskInstance;
    }): Promise<ConcreteTaskInstance>;
    remove(id: string): Promise<void>;
}

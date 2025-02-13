/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStore } from './task_store';
import { ConcreteTaskInstance, PartialConcreteTaskInstance } from './task';
import { Updatable } from './task_running';
import { createBuffer, Operation, BufferOptions, Entity } from './lib/bulk_operation_buffer';
import { unwrapPromise, asErr, asOk } from './lib/result_type';

// by default allow updates to be buffered for up to 50ms
const DEFAULT_BUFFER_MAX_DURATION = 50;

export class BufferedTaskStore implements Updatable {
  private bufferedPartialUpdate: Operation<PartialConcreteTaskInstance>;
  private bufferedUpdate: Operation<ConcreteTaskInstance>;
  private bufferedRemove: Operation<Entity>;

  constructor(private readonly taskStore: TaskStore, options: BufferOptions) {
    this.bufferedUpdate = createBuffer<ConcreteTaskInstance>(
      // Setting validate: false because we'll validate per update call
      //
      // Ideally we could accumulate the "validate" options and pass them
      // to .bulkUpdate per doc, but the required changes to the bulk_operation_buffer
      // to track the values are high and deffered for now.
      (docs) => taskStore.bulkUpdate(docs, { validate: false }),
      {
        bufferMaxDuration: DEFAULT_BUFFER_MAX_DURATION,
        ...options,
      }
    );
    this.bufferedPartialUpdate = createBuffer<PartialConcreteTaskInstance>(
      (docs) => taskStore.bulkPartialUpdate(docs),
      {
        bufferMaxDuration: DEFAULT_BUFFER_MAX_DURATION,
        ...options,
      }
    );
    this.bufferedRemove = createBuffer<Entity>(
      async (ids) => {
        const result = await taskStore.bulkRemove(ids.map(({ id }) => id));
        return result.statuses.map((status) =>
          status.error
            ? asErr({ error: status.error, id: status.id, type: status.type })
            : asOk(status)
        );
      },
      {
        bufferMaxDuration: DEFAULT_BUFFER_MAX_DURATION,
        ...options,
      }
    );
  }

  public async update(
    doc: ConcreteTaskInstance,
    options: { validate: boolean }
  ): Promise<ConcreteTaskInstance> {
    const docToUpdate = this.taskStore.taskValidator.getValidatedTaskInstanceForUpdating(doc, {
      validate: options.validate,
    });
    const result = await unwrapPromise(this.bufferedUpdate(docToUpdate));
    return this.taskStore.taskValidator.getValidatedTaskInstanceFromReading(result, {
      validate: options.validate,
    });
  }

  public async partialUpdate(
    partialDoc: PartialConcreteTaskInstance,
    options: { validate: boolean; doc: ConcreteTaskInstance }
  ): Promise<ConcreteTaskInstance> {
    // merge the partial updates with the doc and validate
    this.taskStore.taskValidator.getValidatedTaskInstanceForUpdating(
      { ...options.doc, ...partialDoc },
      { validate: options.validate }
    );

    const result = await unwrapPromise(this.bufferedPartialUpdate(partialDoc));

    // merge the partial update result with the doc and validate
    return this.taskStore.taskValidator.getValidatedTaskInstanceFromReading(
      { ...options.doc, ...result },
      { validate: options.validate }
    );
  }

  public async remove(id: string): Promise<void> {
    await unwrapPromise(this.bufferedRemove({ id }));
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export function preventParallelCalls<C extends void, A, R>(
  fn: (this: C, arg: A) => Promise<R>,
  filter: (arg: A) => boolean
) {
  const execQueue: Task[] = [];

  class Task {
    public promise: Promise<R>;
    private resolve!: (result: R) => void;
    private reject!: (error: Error) => void;

    constructor(private readonly context: C, private readonly arg: A) {
      this.promise = new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }

    public async exec() {
      try {
        this.resolve(await fn.call(this.context, this.arg));
      } catch (error) {
        this.reject(error);
      } finally {
        execQueue.shift();
        if (execQueue.length) {
          execQueue[0].exec();
        }
      }
    }
  }

  return async function (this: C, arg: A) {
    if (filter(arg)) {
      return await fn.call(this, arg);
    }

    const task = new Task(this, arg);
    if (execQueue.push(task) === 1) {
      // only item in the queue, kick it off
      task.exec();
    }

    return task.promise;
  };
}

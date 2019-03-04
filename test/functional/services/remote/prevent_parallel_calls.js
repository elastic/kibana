/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export function preventParallelCalls(fn, filter) {
  const execQueue = [];

  return async function (arg) {
    if (filter(arg)) {
      return await fn.call(this, arg);
    }

    const task = {
      exec: async () => {
        try {
          task.resolve(await fn.call(this, arg));
        } catch (error) {
          task.reject(error);
        } finally {
          execQueue.shift();
          if (execQueue.length) {
            execQueue[0].exec();
          }
        }
      }
    };

    task.promise = new Promise((resolve, reject) => {
      task.resolve = resolve;
      task.reject = reject;
    });

    if (execQueue.push(task) === 1) {
      // only item in the queue, kick it off
      task.exec();
    }

    return task.promise;
  };
}

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

import Joi from 'joi';

export function initRoutes(server) {
  const { client: taskManagerClient } = server.plugins.taskManager;

  server.route({
    path: '/api/sample_tasks',
    method: 'POST',
    config: {
      validate: {
        payload: Joi.object({
          taskType: Joi.string().required(),
          interval: Joi.string().optional(),
          params: Joi.object().required(),
          state: Joi.object().optional(),
        }),
      },
    },
    async handler(request, reply) {
      try {
        const task = await taskManagerClient.schedule(request.payload, { request });
        reply(task);
      } catch (err) {
        reply(err);
      }
    },
  });

  server.route({
    path: '/api/sample_tasks',
    method: 'GET',
    async handler(_req, reply) {
      try {
        reply(taskManagerClient.fetch());
      } catch (err) {
        reply(err);
      }
    }
  });

  server.route({
    path: '/api/sample_tasks',
    method: 'DELETE',
    async handler(_req, reply) {
      try {
        const { docs: tasks } = await taskManagerClient.fetch();
        reply(Promise.all(tasks.map((task) => taskManagerClient.remove(task.id))));
      } catch (err) {
        reply(err);
      }
    },
  });
}

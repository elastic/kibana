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

import { schema } from '@kbn/config-schema';
import { CoreSetup, Plugin, HttpResponsePayload } from '../../../../../src/core/server';
import { PluginStart as DataPluginStart } from '../../../../../src/plugins/data/server';
import { ExpressionsServerStart } from '../../../../../src/plugins/expressions/server';

export interface TestStartDeps {
  data: DataPluginStart;
  expressions: ExpressionsServerStart;
}

export class TestPlugin implements Plugin<TestPluginSetup, TestPluginStart, {}, TestStartDeps> {
  public setup(core: CoreSetup<TestStartDeps>) {
    const router = core.http.createRouter();

    router.post(
      {
        path: '/api/interpreter_functional/run_expression',
        validate: {
          body: schema.object({
            input: schema.maybe(schema.nullable(schema.object({}, { unknowns: 'allow' }))),
            expression: schema.string(),
          }),
        },
      },
      async (context, req, res) => {
        const [, { expressions }] = await core.getStartServices();
        const output = await expressions.run<unknown, HttpResponsePayload>(
          req.body.expression,
          req.body.input,
          {
            kibanaRequest: req,
          }
        );
        return res.ok({ body: output });
      }
    );
  }

  public start() {}
  public stop() {}
}

export type TestPluginSetup = ReturnType<TestPlugin['setup']>;
export type TestPluginStart = ReturnType<TestPlugin['start']>;

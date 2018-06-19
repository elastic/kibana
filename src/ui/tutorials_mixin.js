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

import _ from 'lodash';
import Joi from 'joi';
import { tutorialSchema } from '../core_plugins/kibana/common/tutorials/tutorial_schema';

export function tutorialsMixin(kbnServer, server) {
  const tutorials = [];

  server.decorate('server', 'getTutorials', () => {
    return _.cloneDeep(tutorials);
  });

  server.decorate('server', 'registerTutorial', (specProvider) => {
    const { error, value } = Joi.validate(specProvider(server), tutorialSchema);

    if (error) {
      throw new Error(`Unable to register tutorial spec because its invalid. ${error}`);
    }

    tutorials.push(value);
  });
}

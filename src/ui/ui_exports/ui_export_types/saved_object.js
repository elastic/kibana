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

import { flatConcatAtType, mergeAtType } from './reduce';
import { alias, mapSpec, uniqueKeys, wrap } from './modify_reduce';

// mapping types
export const mappings = wrap(
  alias('savedObjectMappings'),
  mapSpec((spec, type, pluginSpec) => ({
    pluginId: pluginSpec.getId(),
    properties: spec,
  })),
  flatConcatAtType
);

// Combines the `migrations` property of each plugin,
// ensuring that properties are unique across plugins.
// See saved_objects/migrations for more details.
export const migrations = wrap(alias('savedObjectMigrations'), uniqueKeys(), mergeAtType);

// Combines the `validations` property of each plugin,
// ensuring that properties are unique across plugins.
// See saved_objects/validation for more details.
export const validations = wrap(alias('savedObjectValidations'), uniqueKeys(), mergeAtType);

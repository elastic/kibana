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
// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version
export function getComputedFields() {
  const self = this;
  const scriptFields = {};
  let docvalueFields = [];

  docvalueFields = _.map(_.reject(self.fields.byType.date, 'scripted'), 'name');

  _.each(self.getScriptedFields(), function (field) {
    scriptFields[field.name] = {
      script: {
        inline: field.script,
        lang: field.lang
      }
    };
  });

  return {
    storedFields: ['*'],
    scriptFields: scriptFields,
    docvalueFields: docvalueFields
  };

}

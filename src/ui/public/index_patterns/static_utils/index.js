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

import { KBN_FIELD_TYPES } from '../../../../utils/kbn_field_types';

const filterableTypes = KBN_FIELD_TYPES.filter(type => type.filterable).map(type => type.name);

export function isFilterable(field) {
  return filterableTypes.includes(field.type);
}

export function getFromSavedObject(savedObject) {
  if (!savedObject) {
    return null;
  }

  return {
    fields: JSON.parse(savedObject.attributes.fields),
    title: savedObject.attributes.title,
  };
}

export function getFromLegacyIndexPattern(indexPatterns) {
  return indexPatterns.map(indexPattern => ({
    fields: indexPattern.fields.raw,
    title: indexPattern.title,
  }));
}

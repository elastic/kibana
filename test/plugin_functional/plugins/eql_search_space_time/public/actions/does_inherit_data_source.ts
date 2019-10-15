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

import {
  Embeddable,
  IContainer,
  ContainerInput,
} from '../../../../../../src/plugins/embeddable/public';
import { DataSourceInput } from './data_source_input';

export function doesInheritDataSource(embeddable: Embeddable<DataSourceInput>) {
  if (!embeddable.parent) {
    return false;
  }

  const parent = embeddable.parent as IContainer<{}, ContainerInput<DataSourceInput>>;

  // Note: this logic might not work in a container nested world... the explicit input
  // may be on the root... or any of the interim parents.

  // If there is no explicit input defined on the parent then this embeddable inherits the
  // from the parent.
  return (
    parent.getInput().panels[embeddable.id].explicitInput.indexPattern === undefined &&
    parent.getInput().panels[embeddable.id].explicitInput.filters === undefined &&
    parent.getInput().panels[embeddable.id].explicitInput.query === undefined
  );
}

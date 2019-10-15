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

import React from 'react';
import { Filter } from '@kbn/es-query';
import {
  IEmbeddable,
  Embeddable,
  EmbeddableInput,
} from '../../../../../../src/plugins/embeddable/public';
import { IAction, IncompatibleActionError } from '../../../../../../src/plugins/ui_actions/public';
import { doesInheritDataSource } from './does_inherit_data_source';
import { DataSourceInput } from './data_source_input';
import { ChangeQueryListenerModal } from './change_query_listener_modal';

const CUSTOM_DATA_SOURCE_BADGE = 'CUSTOM_DATA_SOURCE_BADGE';

function hasDataSource(
  embeddable: IEmbeddable | Embeddable<DataSourceInput>
): embeddable is Embeddable<DataSourceInput> {
  return (
    (embeddable as Embeddable<DataSourceInput>).getInput().query !== undefined ||
    (embeddable as Embeddable<DataSourceInput>).getInput().indexPattern !== undefined ||
    (embeddable as Embeddable<DataSourceInput>).getInput().filters !== undefined
  );
}

interface ActionContext {
  embeddable: Embeddable<DataSourceInput>;
}

export class CustomDataSourceBadge implements IAction<ActionContext> {
  public readonly type = CUSTOM_DATA_SOURCE_BADGE;
  public readonly id = CUSTOM_DATA_SOURCE_BADGE;
  public order = 7;
  private openModal: any;

  constructor({ openModal }: { openModal: any }) {
    this.openModal = openModal;
  }

  public getDisplayName({ embeddable }: ActionContext) {
    const siblings = embeddable.parent ? Object.values(embeddable.parent.getInput().panels) : [];

    const dataSource = siblings.find(
      sibling => sibling.explicitInput.id === embeddable.getInput().queryEmitterId
    );

    if (dataSource) {
      const child = embeddable.parent.getChild(dataSource.explicitInput.id);
      return child ? child.getTitle() : '';
    }

    const indexPatternDataSource = embeddable.getInput().indexPattern
      ? `Index pattern: ${embeddable.getInput().indexPattern}`
      : '';
    const queryDataSource = embeddable.getInput().query
      ? `Query: ${embeddable.getInput().query.query}`
      : '';
    const filtersDataSource =
      embeddable.getInput().filters && embeddable.getInput.filters.length > 0
        ? `Filters (${embeddable.getInput().filters.length})`
        : '';

    return `${indexPatternDataSource} ${queryDataSource} ${filtersDataSource}`;
  }

  public getIconType() {
    return 'filter';
  }

  public async isCompatible({ embeddable }: ActionContext) {
    return (
      embeddable.getDataSource() !== undefined && embeddable.getDataSource() !== embeddable.parent
    );
    //    return Boolean(embeddable && hasDataSource(embeddable) && !doesInheritDataSource(embeddable));
  }

  public async execute({ embeddable }: ActionContext) {
    const isCompatible = await this.isCompatible({ embeddable });
    if (!isCompatible) {
      throw new IncompatibleActionError();
    }

    // Only here for typescript
    if (hasDataSource(embeddable)) {
      const modalSession = this.openModal(
        <ChangeQueryListenerModal onClose={() => modalSession.close()} embeddable={embeddable} />
      );
    }
  }
}

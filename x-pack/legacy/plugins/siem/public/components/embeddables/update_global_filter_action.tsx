/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '@kbn/es-query';
import {
  Action,
  ActionContext,
} from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/lib/actions';
import { IEmbeddable } from '../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/lib/embeddables';
import { get, isEmpty } from 'lodash/fp';

export const UPDATE_GLOBAL_FILTER_ACTION_ID = 'UPDATE_GLOBAL_FILTER_ACTION_ID';

export class UpdateGlobalFilterAction extends Action {
  public readonly type = UPDATE_GLOBAL_FILTER_ACTION_ID;
  private readonly applyFilterQueryFromKueryExpression: (expression: string) => void;

  constructor({
    applyFilterQueryFromKueryExpression,
  }: {
    applyFilterQueryFromKueryExpression: (expression: string) => void;
  }) {
    super(UPDATE_GLOBAL_FILTER_ACTION_ID);
    this.applyFilterQueryFromKueryExpression = applyFilterQueryFromKueryExpression;
  }

  public getDisplayName() {
    return 'Update Global Filter Action';
  }

  public execute({
    embeddable,
    triggerContext,
  }: ActionContext<IEmbeddable, { filters: Filter[] }>) {
    // {
    //   "filters": [
    //   {
    //     "meta": {
    //       "index": "25df3270-c04d-11e9-a93a-29c67776e569"
    //     },
    //     "query": {
    //       "match": {
    //         "host.name": {
    //           "query": "suricata-toronto-sha-aa8df15",
    //           "type": "phrase"
    //         }
    //       }
    //     }
    //   }
    // ]
    // }
    const filterObject = get('filters[0].query.match', triggerContext);
    const filterKey = Object.keys(filterObject)[0];
    const filterExpression = `${filterKey}: "${filterObject[filterKey].query}"`;
    console.log('Apply Filter Query:', triggerContext);
    console.log('Parsed Filter Expression', filterExpression);
    this.applyFilterQueryFromKueryExpression(
      filterExpression
      // filterQueryDraft && !isEmpty(filterQueryDraft.expression)
      //   ? `${filterQueryDraft.expression} and ${expression}`
      //   : expression
    );
  }
}

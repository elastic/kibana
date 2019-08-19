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

export const UPDATE_GLOBAL_FILTER_ACTION_ID = 'UPDATE_GLOBAL_FILTER_ACTION_ID';

export class UpdateGlobalFilterAction extends Action {
  public readonly type = UPDATE_GLOBAL_FILTER_ACTION_ID;

  constructor() {
    super(UPDATE_GLOBAL_FILTER_ACTION_ID);
  }

  public getDisplayName() {
    return 'Update Global Filter Action';
  }

  public execute({
    embeddable,
    triggerContext,
  }: ActionContext<IEmbeddable, { filters: Filter[] }>) {
    console.log('Apply Filter Query:', triggerContext);
  }
}

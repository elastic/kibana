/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { IAction } from 'src/plugins/ui_actions/public';
import { IEmbeddable } from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
// @ts-ignore Missing type defs as maps moves to Typescript
import { MAP_SAVED_OBJECT_TYPE } from '../../../../../maps/common/constants';
import { siemFilterManager } from '../../search_bar';

export const APPLY_SIEM_FILTER_ACTION_ID = 'APPLY_SIEM_FILTER_ACTION_ID';

export interface ActionContext {
  embeddable: IEmbeddable;
  filters: Filter[];
}

export class ApplySiemFilterAction implements IAction<ActionContext> {
  public readonly type = APPLY_SIEM_FILTER_ACTION_ID;
  public id = APPLY_SIEM_FILTER_ACTION_ID;

  public getDisplayName() {
    return i18n.translate('xpack.siem.components.embeddables.actions.applySiemFilterActionTitle', {
      defaultMessage: 'Apply filter',
    });
  }

  public getIconType() {
    return undefined;
  }

  public async isCompatible(context: ActionContext): Promise<boolean> {
    return context.embeddable.type === MAP_SAVED_OBJECT_TYPE && context.filters !== undefined;
  }

  public async execute({ embeddable, filters }: ActionContext) {
    if (!filters) {
      throw new TypeError('Applying a filter requires a filter as context');
    }
    siemFilterManager.addFilters(filters);
  }
}

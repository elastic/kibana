/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '@kbn/es-query';
import { getOr } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
// @ts-ignore Missing type defs as maps moves to Typescript
import { MAP_SAVED_OBJECT_TYPE } from '../../../../../maps/common/constants';
import {
  Action,
  ActionContext,
} from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/lib/actions';
import { IEmbeddable } from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/lib/embeddables';
import { IncompatibleActionError } from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/lib';

export const APPLY_SIEM_FILTER_ACTION_ID = 'APPLY_SIEM_FILTER_ACTION_ID';

export class ApplySiemFilterAction extends Action {
  public readonly type = APPLY_SIEM_FILTER_ACTION_ID;
  private readonly applyFilterQueryFromKueryExpression: (expression: string) => void;

  constructor({
    applyFilterQueryFromKueryExpression,
  }: {
    applyFilterQueryFromKueryExpression: (filterQuery: string) => void;
  }) {
    super(APPLY_SIEM_FILTER_ACTION_ID);
    this.applyFilterQueryFromKueryExpression = applyFilterQueryFromKueryExpression;
  }

  public getDisplayName() {
    return i18n.translate('xpack.siem.components.embeddables.actions.applySiemFilterActionTitle', {
      defaultMessage: 'Apply filter',
    });
  }

  public async isCompatible(context: ActionContext<IEmbeddable, { filters: Filter[] }>) {
    return Boolean(
      context.embeddable.type === MAP_SAVED_OBJECT_TYPE &&
        context.triggerContext &&
        context.triggerContext.filters !== undefined
    );
  }

  public execute({
    embeddable,
    triggerContext,
  }: ActionContext<IEmbeddable, { filters: Filter[] }>) {
    if (!triggerContext) {
      throw new Error('Applying a filter requires a filter as context');
    }

    if (!this.isCompatible({ triggerContext, embeddable })) {
      throw new IncompatibleActionError();
    }

    // Parse queryExpression from queryDSL and apply to SIEM global KQL Bar via redux
    const filterObject = getOr({}, 'filters[0].query.match', triggerContext);
    const filterQuery = getOr('', 'query.query', embeddable.getInput());
    const filterKey = filterObject && Object.keys(filterObject)[0];

    if (filterKey != null) {
      const filterExpression = Array.isArray(filterObject[filterKey].query)
        ? getExpressionFromArray(filterKey, filterObject[filterKey].query)
        : `${filterKey}: "${filterObject[filterKey].query}"`;

      this.applyFilterQueryFromKueryExpression(
        filterQuery.length > 0 ? `${filterQuery} and ${filterExpression}` : filterExpression
      );
    }
  }
}

export const getExpressionFromArray = (filterKey: string, filterValues: string[]) => {
  const filterList = filterValues.reduce(
    (acc: string[], filterValue: string) => [...acc, `${filterKey}: "${filterValue}"`],
    []
  );
  return filterList.length > 0 ? `(${filterList.join(' OR ')})` : '';
};

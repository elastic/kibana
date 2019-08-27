/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '@kbn/es-query';
import { get } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import {
  Action,
  ActionContext,
} from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/lib/actions';
import { IEmbeddable } from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/lib/embeddables';

export const APPLY_SIEM_FILTER_ACTION_ID = 'APPLY_SIEM_FILTER_ACTION_ID';

export class ApplySiemFilterAction extends Action {
  public readonly type = APPLY_SIEM_FILTER_ACTION_ID;
  private readonly applyFilterQueryFromKueryExpression: (expression: string) => void;
  private readonly getFilterQueryDraft: () => string;

  constructor({
    applyFilterQueryFromKueryExpression,
    getFilterQueryDraft,
  }: {
    applyFilterQueryFromKueryExpression: (filterQueryDraft: string) => void;
    getFilterQueryDraft: () => string;
  }) {
    super(APPLY_SIEM_FILTER_ACTION_ID);
    this.applyFilterQueryFromKueryExpression = applyFilterQueryFromKueryExpression;
    this.getFilterQueryDraft = getFilterQueryDraft;
  }

  public getDisplayName() {
    return i18n.translate('xpack.siem.components.embeddables..applySiemFilterActionTitle', {
      defaultMessage: 'Apply filter',
    });
  }

  public execute({
    embeddable,
    triggerContext,
  }: ActionContext<IEmbeddable, { filters: Filter[] }>) {
    const filterObject = get('filters[0].query.match', triggerContext);
    const filterKey = filterObject && Object.keys(filterObject)[0];
    if (filterKey != null) {
      const filterExpression = Array.isArray(filterObject[filterKey].query)
        ? getExpressionFromArray(filterKey, filterObject[filterKey].query)
        : `${filterKey}: "${filterObject[filterKey].query}"`;

      const filterQueryDraft = this.getFilterQueryDraft();

      // console.log('filterObject', filterObject);
      // console.log('filterExpression', filterExpression);
      // console.log('filterQueryDraft', filterQueryDraft);

      this.applyFilterQueryFromKueryExpression(
        filterQueryDraft.length > 0
          ? `${filterQueryDraft} and ${filterExpression}`
          : filterExpression
      );
    }
  }
}

export const getExpressionFromArray = (filterKey: string, filterValues: string[]) => {
  const filterList = filterValues.reduce(
    (acc: string[], filterValue: string) => [...acc, `${filterKey}: "${filterValue}"`],
    []
  );
  return `(${filterList.join(' OR ')})`;
};

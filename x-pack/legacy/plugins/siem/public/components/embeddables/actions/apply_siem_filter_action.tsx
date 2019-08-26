/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '@kbn/es-query';
import { get, isEmpty } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import {
  Action,
  ActionContext,
} from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/lib/actions';
import { IEmbeddable } from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/lib/embeddables';
import { KueryFilterQuery } from '../../../store';

export const APPLY_SIEM_FILTER_ACTION_ID = 'APPLY_SIEM_FILTER_ACTION_ID';

export class ApplySiemFilterAction extends Action {
  public readonly type = APPLY_SIEM_FILTER_ACTION_ID;
  private readonly applyFilterQueryFromKueryExpression: (expression: string) => void;
  private readonly getFilterQueryDraft: () => KueryFilterQuery;

  constructor({
    applyFilterQueryFromKueryExpression,
    getFilterQueryDraft,
  }: {
    applyFilterQueryFromKueryExpression: (filterQueryDraft: string) => void;
    getFilterQueryDraft: () => KueryFilterQuery;
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
      const filterExpression = `${filterKey}: "${filterObject[filterKey].query}"`;
      const filterQueryDraft = this.getFilterQueryDraft();
      this.applyFilterQueryFromKueryExpression(
        filterQueryDraft && !isEmpty(filterQueryDraft.expression)
          ? `${filterQueryDraft.expression} and ${filterExpression}`
          : filterExpression
      );
    }
  }
}

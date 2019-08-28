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

  public async isCompatible(
    context: ActionContext<IEmbeddable, { filters: Filter[] }>
  ): Promise<boolean> {
    return (
      context.embeddable.type === MAP_SAVED_OBJECT_TYPE &&
      context.triggerContext != null &&
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

    // Parse queryExpression from queryDSL and apply to SIEM global KQL Bar via redux
    const filterObject = getOr(null, 'filters[0].query.match', triggerContext);

    if (filterObject != null) {
      const filterQuery = getOr('', 'query.query', embeddable.getInput());
      const filterKey = Object.keys(filterObject)[0];

      const filterExpression = Array.isArray(filterObject[filterKey].query)
        ? getExpressionFromArray(filterKey, filterObject[filterKey].query)
        : `${filterKey}: "${filterObject[filterKey].query}"`;

      this.applyFilterQueryFromKueryExpression(
        filterQuery.length > 0 ? `${filterQuery} and ${filterExpression}` : filterExpression
      );
    }
  }
}

export const getExpressionFromArray = (filterKey: string, filterValues: string[]) =>
  filterValues.length > 0
    ? `(${filterValues.map(filterValue => `${filterKey}: "${filterValue}"`).join(' OR ')})`
    : '';

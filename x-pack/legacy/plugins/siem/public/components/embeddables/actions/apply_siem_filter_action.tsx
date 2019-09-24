/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Filter } from '@kbn/es-query';
import { getOr } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import { IAction } from 'src/plugins/ui_actions/public';
// @ts-ignore Missing type defs as maps moves to Typescript
import { MAP_SAVED_OBJECT_TYPE } from '../../../../../maps/common/constants';
import { IEmbeddable } from '../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/lib/embeddables';

export const APPLY_SIEM_FILTER_ACTION_ID = 'APPLY_SIEM_FILTER_ACTION_ID';

export interface ActionContext {
  embeddable: IEmbeddable;
  filters: Filter[];
}

export class ApplySiemFilterAction implements IAction<ActionContext> {
  public readonly type = APPLY_SIEM_FILTER_ACTION_ID;
  private readonly applyFilterQueryFromKueryExpression: (expression: string) => void;
  public id = APPLY_SIEM_FILTER_ACTION_ID;

  constructor({
    applyFilterQueryFromKueryExpression,
  }: {
    applyFilterQueryFromKueryExpression: (filterQuery: string) => void;
  }) {
    this.applyFilterQueryFromKueryExpression = applyFilterQueryFromKueryExpression;
  }

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

    // Parse queryExpression from queryDSL and apply to SIEM global KQL Bar via redux
    const filterObject = getOr(null, '[0].query.match', filters);

    if (filterObject != null) {
      const filterQuery = getOr('', 'query.query', embeddable.getInput());
      const filterKey = Object.keys(filterObject)[0];

      const filterExpression = getFilterExpression(filterKey, filterObject[filterKey].query);

      this.applyFilterQueryFromKueryExpression(
        filterQuery.length > 0 ? `${filterQuery} and ${filterExpression}` : filterExpression
      );
    }
  }
}

export const getFilterExpression = (
  filterKey: string,
  filterValue: string | string[] | undefined
): string => {
  if (Array.isArray(filterValue)) {
    return getExpressionFromArray(filterKey, filterValue);
  } else if (filterValue != null) {
    return `${filterKey}: "${filterValue}"`;
  } else {
    return `(NOT ${filterKey}:*)`;
  }
};

export const getExpressionFromArray = (filterKey: string, filterValues: string[]): string =>
  filterValues.length > 0
    ? `(${filterValues.map(filterValue => `${filterKey}: "${filterValue}"`).join(' OR ')})`
    : '';

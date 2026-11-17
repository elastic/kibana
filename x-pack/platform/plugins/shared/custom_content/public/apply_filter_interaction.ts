/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPhraseFilter, toggleFilterNegated, type Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ON_APPLY_FILTER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { FilterInteraction } from '@kbn/custom-content-renderer';

const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

/**
 * Builds the filter a template asked for. The template only names a column and a value: the field
 * has to be a plain filterable field of one of the panel's own data views, which is also what binds
 * the filter to a data view (`meta.index`). Returns undefined when nothing can be built, so a
 * template can never produce a filter Kibana would not build for a click on a chart.
 */
export const buildInteractionFilter = (
  { field, value, negate }: FilterInteraction,
  dataViews: readonly DataView[]
): Filter | undefined => {
  const dataView = dataViews.find((candidate) => {
    const dataViewField = candidate.getFieldByName(field);
    return dataViewField?.filterable === true && !dataViewField.scripted;
  });
  const dataViewField = dataView?.getFieldByName(field);
  if (!dataView || !dataViewField) return undefined;

  // `Number()` alone would turn " " into 0 and "0x10" or "1e3" into other numbers.
  if (dataViewField.type === 'number' && !PLAIN_NUMBER.test(value)) return undefined;
  const filterValue = dataViewField.type === 'number' ? Number(value) : value;
  if (typeof filterValue === 'number' && !Number.isFinite(filterValue)) return undefined;

  const filter = buildPhraseFilter(dataViewField, filterValue, dataView);
  return negate ? toggleFilterNegated(filter) : filter;
};

/** Applies the filter through the platform trigger, so the dashboard decides what happens to it. */
export const applyFilterInteraction = async ({
  interaction,
  dataViews,
  uiActions,
  embeddable,
}: {
  interaction: FilterInteraction;
  dataViews: readonly DataView[] | undefined;
  uiActions: UiActionsStart;
  embeddable: unknown;
}): Promise<void> => {
  const filter = buildInteractionFilter(interaction, dataViews ?? []);
  if (!filter) return;
  await uiActions.executeTriggerActions(ON_APPLY_FILTER, { filters: [filter], embeddable });
};

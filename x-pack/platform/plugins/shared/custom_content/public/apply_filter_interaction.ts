/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateFilters, type FilterManager } from '@kbn/data-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import { ON_APPLY_FILTER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { FilterInteraction } from '@kbn/custom-content-renderer';
import type { InteractionHost } from './interaction_host';

const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

/**
 * Builds the filters a template asked for, the way Discover does: `generateFilters` from the data
 * plugin, which reuses a filter that is already on the dashboard (clicking a value that is already
 * excluded flips that filter instead of adding a contradicting one) and handles dates.
 *
 * What it cannot know is left here. The template only names a column and a value, so the field has
 * to be a plain filterable field of one of the panel's own data views, which also decides the data
 * view the filter binds to (`meta.index`); and the value arrives as text from an attribute, where
 * the cells of a Lens table are already typed. Returns none when nothing can be built, so a
 * template can never produce a filter Kibana would not build for a click on a chart.
 */
export const buildInteractionFilters = (
  { field, value, negate }: FilterInteraction,
  dataViews: readonly DataView[],
  filterManager: FilterManager
): Filter[] => {
  const dataView = dataViews.find((candidate) => {
    const dataViewField = candidate.getFieldByName(field);
    return dataViewField?.filterable === true && !dataViewField.scripted;
  });
  const dataViewField = dataView?.getFieldByName(field);
  if (!dataView || !dataViewField) return [];

  // `Number()` alone would turn " " into 0 and "0x10" or "1e3" into other numbers.
  if (dataViewField.type === 'number' && !PLAIN_NUMBER.test(value)) return [];
  const filterValue = dataViewField.type === 'number' ? Number(value) : value;
  if (typeof filterValue === 'number' && !Number.isFinite(filterValue)) return [];

  return generateFilters(filterManager, dataViewField, filterValue, negate ? '-' : '+', dataView);
};

/** Applies the filters through the platform trigger, so the dashboard decides what happens to them. */
export const applyFilterInteraction = async (
  interaction: FilterInteraction,
  { dataViews, filterManager, uiActions, embeddable }: InteractionHost
): Promise<void> => {
  const filters = buildInteractionFilters(interaction, dataViews ?? [], filterManager);
  if (filters.length === 0) return;
  await uiActions.executeTriggerActions(ON_APPLY_FILTER, { filters, embeddable });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateFilters, type FilterManager } from '@kbn/data-plugin/public';
import type { Filter } from '@kbn/es-query';
import type { FilterableSource } from '@kbn/data-source';
import { ON_APPLY_FILTER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { FilterInteraction } from '@kbn/custom-content-renderer';
import type { InteractionHost } from './interaction_host';

// What a number looks like once Liquid has printed it: `1e-7` and `1e+21` as well as `12.5`.
const PLAIN_NUMBER = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

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
  dataSources: readonly FilterableSource[],
  filterManager: FilterManager
): Filter[] => {
  // A data view or an ES|QL dataset: all this reads is `fields`, and `generateFilters` takes the
  // `DataViewBase` a source is, so the same code serves both.
  const isFilterableField = ({ name, filterable, scripted }: FilterableSource['fields'][number]) =>
    name === field && filterable === true && !scripted;

  // The click does not say which query it came from, so every source with the field is tried, in
  // order, and the first that can take the value wins: `status` can be a number in one query and a
  // keyword in another.
  for (const source of dataSources) {
    const sourceField = source.fields.find(isFilterableField);
    const filterValue = sourceField && toFieldValue(sourceField.type, value);
    if (sourceField && filterValue !== undefined) {
      return generateFilters(filterManager, sourceField, filterValue, negate ? '-' : '+', source);
    }
  }
  return [];
};

/** The value as the field holds it: text stays text, a number is parsed, and a bad number is none. */
const toFieldValue = (type: string | undefined, value: string): string | number | undefined => {
  if (type !== 'number') return value;
  // `Number()` alone would turn " " into 0 and "0x10" into 16.
  if (!PLAIN_NUMBER.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** Applies the filters through the platform trigger, so the dashboard decides what happens to them. */
export const applyFilterInteraction = async (
  interaction: FilterInteraction,
  { dataSources, filterManager, uiActions, embeddable }: InteractionHost
): Promise<void> => {
  const filters = buildInteractionFilters(interaction, dataSources ?? [], filterManager);
  if (filters.length === 0) return;
  await uiActions.executeTriggerActions(ON_APPLY_FILTER, { filters, embeddable });
};

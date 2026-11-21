/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateFilters, type FilterManager } from '@kbn/data-plugin/public';
import { getConvertedValueForField, type Filter } from '@kbn/es-query';
import type { FilterableField, FilterableSource } from '@kbn/data-source';
import { ON_APPLY_FILTER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { FilterInteraction } from '@kbn/custom-content-renderer';
import type { InteractionHost } from './run_interaction';

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
    const filterValue = sourceField && toFieldValue(sourceField, value);
    if (sourceField && filterValue !== undefined) {
      return generateFilters(filterManager, sourceField, filterValue, negate ? '-' : '+', source);
    }
  }
  return [];
};

/**
 * Whether text is a number the field can hold. `Number()` alone would turn " " into 0 and "0x10"
 * into 16, and "ten" into NaN, which JSON sends as null.
 */
const isPlainNumber = (value: string): boolean =>
  PLAIN_NUMBER.test(value) && Number.isFinite(Number(value));

/**
 * The value as the field holds it, with the platform's own conversion (the one `buildPhraseFilter`
 * applies): text for a number field becomes a number and `true` / `false` become booleans. It matters
 * beyond the query: `generateFilters` finds a filter that is already there with `===`, so `true` has
 * to be the boolean a click on a chart would have used. Nothing at all when the text is not a value
 * of that type, where a click on a chart never has the problem, as its cells are typed.
 */
const toFieldValue = (
  field: FilterableField,
  value: string
): string | number | boolean | undefined => {
  if (field.type === 'number' && !isPlainNumber(value)) return undefined;
  try {
    return getConvertedValueForField(field, value);
  } catch {
    // The text is neither `true` nor `false`, for a boolean field.
    return undefined;
  }
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

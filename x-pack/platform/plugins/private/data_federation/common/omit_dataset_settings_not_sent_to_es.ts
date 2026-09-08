/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dataset, DatasetSettings } from './dataset_types';

/**
 * Shown in the parquet UI, but Elasticsearch rejects them as unknown settings.
 * Keep the form; drop them from every create/update body sent to ES.
 */
export const omitDatasetSettingsNotSentToEs = (
  settings: DatasetSettings | undefined
): DatasetSettings | undefined => {
  if (!settings) {
    return undefined;
  }

  const { optimized_reader: _optimizedReader, late_materialization: _lateMaterialization, ...rest } =
    settings;

  return Object.keys(rest).length > 0 ? rest : undefined;
};

export const omitDatasetFieldsNotSentToEs = (dataset: Dataset): Dataset => {
  const { settings, ...rest } = dataset;
  const nextSettings = omitDatasetSettingsNotSentToEs(settings);

  return nextSettings ? { ...rest, settings: nextSettings } : rest;
};

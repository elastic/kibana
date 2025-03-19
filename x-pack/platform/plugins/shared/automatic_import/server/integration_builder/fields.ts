/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import nunjucks from 'nunjucks';
import { load } from 'js-yaml';
import { Field } from '../util/samples';
import { createSync, generateFields, mergeSamples } from '../util';

export function createFieldMapping(
  packageName: string,
  dataStreamName: string,
  specificDataStreamDir: string,
  docs: object[]
): Field[] {
  const dataStreamFieldsDir = `${specificDataStreamDir}/fields`;
  const baseFields = createBaseFields(dataStreamFieldsDir, packageName, dataStreamName);
  const customFields = createCustomFields(dataStreamFieldsDir, docs);

  return [...baseFields, ...customFields];
}

function createBaseFields(
  dataStreamFieldsDir: string,
  packageName: string,
  dataStreamName: string
): Field[] {
  const datasetName = `${packageName}.${dataStreamName}`;
  const baseFields = nunjucks.render('base_fields.yml.njk', {
    module: packageName,
    dataset: datasetName,
  });
  createSync(`${dataStreamFieldsDir}/base-fields.yml`, baseFields);

  return load(baseFields) as Field[];
}

function createCustomFields(dataStreamFieldsDir: string, pipelineResults: object[]): Field[] {
  const mergedResults = mergeSamples(pipelineResults);
  const fieldKeys = generateFields(mergedResults);
  createSync(`${dataStreamFieldsDir}/fields.yml`, fieldKeys);

  return load(fieldKeys) as Field[];
}

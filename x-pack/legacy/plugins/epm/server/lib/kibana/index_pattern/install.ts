/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { KibanaAssetType } from '../../../../common/types';
import { RegistryPackage, Dataset } from '../../../../common/types';
import { Field } from '../../fields/field';
import { loadFieldsFromYaml } from '../../elasticsearch/template/install';
import * as Registry from '../../../registry';

interface IndexPatternField extends Field {
  searchable: boolean;
  aggregatable: boolean;
  readFromDocValues: boolean;
}
export async function installIndexPatterns(
  pkgkey: string,
  savedObjectsClient: SavedObjectsClientContract
) {
  const registryPackageInfo = await Registry.fetchInfo(pkgkey);
  if (!registryPackageInfo.datasets) return;
  const datasets = registryPackageInfo.datasets;
  // separate logs and metrics datasets
  const logsDatasets = datasets.filter(dataset => dataset.type === 'logs');
  const metricsDatasets = datasets.filter(dataset => dataset.type === 'metric');
  createIndexPattern({
    datasetType: 'logs',
    datasets: logsDatasets,
    registryPackageInfo,
    savedObjectsClient,
  });
  createIndexPattern({
    datasetType: 'metrics',
    datasets: metricsDatasets,
    registryPackageInfo,
    savedObjectsClient,
  });
}

// loop through each dataset, get all the fields, create index pattern by type.
const createIndexPattern = async ({
  datasetType,
  datasets,
  registryPackageInfo,
  savedObjectsClient,
}: {
  datasetType: string;
  datasets: Dataset[];
  registryPackageInfo: RegistryPackage;
  savedObjectsClient: SavedObjectsClientContract;
}) => {
  let allFields: Field[] = [];
  for (let i = 0; i < datasets.length; i++) {
    const fields = await loadFieldsFromYaml(registryPackageInfo, datasets[i].name);
    allFields = allFields.concat(fields);
  }

  const kibanaIndexPatternFields = makeKibanaIndexPatternFields(allFields);

  savedObjectsClient.create(KibanaAssetType.indexPattern, {
    title: datasetType + '-*',
    fields: JSON.stringify(kibanaIndexPatternFields),
  });
};

/**
 * makeKibanaIndexPatternFields
 *
 * dedupes fields, flattens fields, dedupes the previously nested fields, transform with necessary
 * Kibana index pattern properties
 */
const makeKibanaIndexPatternFields = (fields: Field[]): IndexPatternField[] => {
  const dedupedFields = dedupFields(fields);
  const flattenedFields = flattenFields(dedupedFields);
  const transformedFields = flattenedFields.map(transformField);
  return transformedFields;
};

const dedupFields = (fields: Field[]) => {
  const uniqueObj = fields.reduce<{ [name: string]: Field }>((acc, field) => {
    if (!acc[field.name]) {
      acc[field.name] = field;
    }
    return acc;
  }, {});

  return Object.values(uniqueObj);
};

const transformField = (field: Field): IndexPatternField => {
  const newField = { ...field };

  // map this type to field type
  if (typeMap[field.type]) {
    newField.type = typeMap[field.type];
  }

  // add some temp values
  return {
    searchable: false,
    aggregatable: false,
    readFromDocValues: true,
    ...newField,
  };
};

/**
 * flattenFields
 *
 * flattens fields and renames them with a path of the parent names
 */
const flattenFields = (fields: Field[]): Field[] =>
  fields.reduce<Field[]>((acc, field) => {
    if (field.fields?.length) {
      const flattenedFields = flattenFields(field.fields);
      flattenedFields.forEach(nestedField => {
        acc.push({ ...nestedField, name: `${field.name}.${nestedField.name}` });
      });
    } else {
      acc.push(field);
    }
    return acc;
  }, []);

interface TypeMap {
  [key: string]: string;
}
const typeMap: TypeMap = {
  binary: 'binary',
  half_float: 'number',
  scaled_float: 'number',
  float: 'number',
  integer: 'number',
  long: 'number',
  short: 'number',
  byte: 'number',
  text: 'string',
  keyword: 'string',
  '': 'string',
  geo_point: 'geo_point',
  date: 'date',
  ip: 'ip',
  boolean: 'boolean',
  /* TODO: add alias support */
  alias: 'string',
};

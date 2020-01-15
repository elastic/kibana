/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { KibanaAssetType } from '../../../../common/types';
import { RegistryPackage, Dataset } from '../../../../common/types';
import * as Registry from '../../../registry';
import { loadFieldsFromYaml, Fields, Field } from '../../fields/field';

export interface IndexPatternField {
  name: string;
  type?: string;
  count: number;
  scripted: boolean;
  indexed: boolean;
  analyzed: boolean;
  searchable: boolean;
  aggregatable: boolean;
  doc_values: boolean;
  enabled?: boolean;
  script?: string;
  lang?: string;
  readFromDocValues: boolean;
}

enum IndexPatternType {
  logs = 'logs',
  metrics = 'metrics',
}

export async function installIndexPatterns(
  pkgkey: string,
  savedObjectsClient: SavedObjectsClientContract
) {
  const registryPackageInfo = await Registry.fetchInfo(pkgkey);
  const registryDatasets = registryPackageInfo.datasets;
  if (!registryDatasets) return;

  const indexPatternTypes = [IndexPatternType.logs, IndexPatternType.metrics];

  indexPatternTypes.forEach(async indexPatternType => {
    const datasets = registryDatasets.filter(dataset => dataset.type === indexPatternType);
    await createIndexPattern({
      datasetType: indexPatternType,
      datasets,
      registryPackageInfo,
      savedObjectsClient,
    });
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
  const loadingFields = datasets.map(dataset =>
    loadFieldsFromYaml(registryPackageInfo, dataset.name)
  );
  const nestedResults = await Promise.all(loadingFields);
  const allFields = nestedResults.flat();

  const kibanaIndexPatternFields = makeKibanaIndexPatternFields(allFields);

  await savedObjectsClient.create(KibanaAssetType.indexPattern, {
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
const makeKibanaIndexPatternFields = (fields: Fields): IndexPatternField[] => {
  const dedupedFields = dedupeFields(fields);
  const flattenedFields = flattenFields(dedupedFields);
  const transformedFields = flattenedFields.map(transformField);
  return transformedFields;
};

export const dedupeFields = (fields: Fields) => {
  const uniqueObj = fields.reduce<{ [name: string]: Field }>((acc, field) => {
    if (!acc[field.name]) {
      acc[field.name] = field;
    }
    return acc;
  }, {});

  return Object.values(uniqueObj);
};

export const transformField = (field: Field): IndexPatternField => {
  const newField: IndexPatternField = {
    name: field.name,
    count: field.count ?? 0,
    scripted: false,
    indexed: field.index ?? true,
    analyzed: field.analyzed ?? false,
    searchable: field.searchable ?? true,
    aggregatable: field.aggregatable ?? true,
    doc_values: field.doc_values ?? true,
    readFromDocValues: true,
  };

  // if type exists, check if it exists in the map
  if (field.type) {
    // if no type match type is not set (undefined)
    if (typeMap[field.type]) {
      newField.type = typeMap[field.type];
    }
    // if type isn't set, default to string
  } else {
    newField.type = 'string';
  }

  if (newField.type === 'binary') {
    newField.aggregatable = false;
    newField.analyzed = false;
    newField.doc_values = field.doc_values ?? false;
    newField.indexed = false;
    newField.searchable = false;
  }

  if (field.type === 'object' && field.hasOwnProperty('enabled')) {
    const enabled = field.enabled ?? true;
    newField.enabled = enabled;
    if (!enabled) {
      newField.aggregatable = false;
      newField.analyzed = false;
      newField.doc_values = false;
      newField.indexed = false;
      newField.searchable = false;
    }
  }

  if (field.type === 'text') {
    newField.aggregatable = false;
  }

  if (field.hasOwnProperty('script')) {
    newField.scripted = true;
    newField.script = field.script;
    newField.lang = 'painless';
    newField.doc_values = false;
  }

  return newField;
};

/**
 * flattenFields
 *
 * flattens fields and renames them with a path of the parent names
 */
export const flattenFields = (fields: Fields): Fields =>
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

/* this should match https://github.com/elastic/beats/blob/d9a4c9c240a9820fab15002592e5bb6db318543b/libbeat/kibana/fields_transformer.go */
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

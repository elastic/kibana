/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { RegistryPackage, Dataset } from '../../../../common/types';
import { Field } from '../../fields/field';
import { loadFieldsFromYaml } from '../../elasticsearch/template/install';
import * as Registry from '../../../registry';

interface IndexPatternField extends Field {
  searchable: boolean;
  aggregatable: boolean;
  readFromDocValues: boolean;
}
interface DatasetMapByType {
  logs: string[];
  metrics: string[];
}
export async function installIndexPatterns(
  pkgkey: string,
  savedObjectsClient: SavedObjectsClientContract
) {
  const registryPackageInfo = await Registry.fetchInfo(pkgkey);
  if (!registryPackageInfo.datasets) return;

  // sort datasets by logs and metrics
  const datasetMapByType = sortLogsMetricsTypes(registryPackageInfo.datasets);

  createIndexPatternByType('logs', datasetMapByType.logs, registryPackageInfo, savedObjectsClient);
  createIndexPatternByType(
    'metrics',
    datasetMapByType.metrics,
    registryPackageInfo,
    savedObjectsClient
  );
}

const sortLogsMetricsTypes = (datasets: Dataset[]): DatasetMapByType =>
  datasets.reduce<DatasetMapByType>(
    (acc, dataset) => {
      if (dataset.type === 'logs') {
        acc.logs.push(dataset.name);
      }
      if (dataset.type === 'metric') {
        acc.metrics.push(dataset.name);
      }
      return acc;
    },
    {
      logs: [],
      metrics: [],
    }
  );

// loop through each dataset, get all the fields, create index pattern by type.
const createIndexPatternByType = async (
  datasetType: string,
  datasetList: string[],
  registryPackageInfo: RegistryPackage,
  savedObjectsClient: SavedObjectsClientContract
) => {
  let allFields: Field[] = [];
  for (let i = 0; i < datasetList.length; i++) {
    const fields = await loadFieldsFromYaml(registryPackageInfo, datasetList[i]);
    allFields = allFields.concat(fields);
  }

  const kibanaIndexPatternFields = makeKibanaIndexPatternFields(allFields);
  savedObjectsClient.create('index-pattern', {
    title: datasetType + '-*',
    fields: JSON.stringify(kibanaIndexPatternFields),
  });
};

const makeKibanaIndexPatternFields = (fields: Field[]): IndexPatternField[] => {
  const flattenedFields = flattenFields(fields);
  const transformedFields = transformFields(flattenedFields);
  return transformedFields;
};

const transformFields = (fields: Field[]): IndexPatternField[] => {
  return fields.map(item => {
    const newItem = { ...item };

    // map this type to field type
    if (typeMap[item.type]) {
      newItem.type = typeMap[item.type];
    }

    // add some temp values
    return {
      searchable: false,
      aggregatable: false,
      readFromDocValues: true,
      ...newItem,
    };
  });
};

const flattenFields = (fields: Field[]): Field[] =>
  fields.reduce<Field[]>((acc, field) => {
    if (field.fields && field.fields.length) {
      acc = acc.concat(flattenFields(field.fields));
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

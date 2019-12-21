/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
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
  const fields = await loadFieldsFromYaml(registryPackageInfo);
  const kibanaIndexPatternFields = makeKibanaIndexPatternFields(fields);
  // TODO: separate out logs and metrics patterns
  await savedObjectsClient.create(
    'index-pattern',
    getData('logs-metrics', kibanaIndexPatternFields)
  );
}

function getData(name: string, fields: IndexPatternField[]) {
  return {
    title: name + '-*',
    fields: JSON.stringify(fields),
  };
}

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

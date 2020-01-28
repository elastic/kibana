/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getNestedProperty } from '../../util/object_utils';
import {
  DataFrameAnalyticsConfig,
  getPredictedFieldName,
  getDependentVar,
  getPredictionFieldName,
} from './analytics';
import { Field } from '../../../../common/types/fields';
import { ES_FIELD_TYPES } from '../../../../../../../../src/plugins/data/public';
import { newJobCapsService } from '../../services/new_job_capabilities_service';

export type EsId = string;
export type EsDocSource = Record<string, any>;
export type EsFieldName = string;

export interface EsDoc extends Record<string, any> {
  _id: EsId;
  _source: EsDocSource;
}

export const MAX_COLUMNS = 20;
export const DEFAULT_REGRESSION_COLUMNS = 8;

export const BASIC_NUMERICAL_TYPES = new Set([
  ES_FIELD_TYPES.LONG,
  ES_FIELD_TYPES.INTEGER,
  ES_FIELD_TYPES.SHORT,
  ES_FIELD_TYPES.BYTE,
]);

export const EXTENDED_NUMERICAL_TYPES = new Set([
  ES_FIELD_TYPES.DOUBLE,
  ES_FIELD_TYPES.FLOAT,
  ES_FIELD_TYPES.HALF_FLOAT,
  ES_FIELD_TYPES.SCALED_FLOAT,
]);

const ML__ID_COPY = 'ml__id_copy';

export const isKeywordAndTextType = (fieldName: string): boolean => {
  const { fields } = newJobCapsService;

  const fieldType = fields.find(field => field.name === fieldName)?.type;
  let isBothTypes = false;

  // If it's a keyword type - check if it has a corresponding text type
  if (fieldType !== undefined && fieldType === ES_FIELD_TYPES.KEYWORD) {
    const field = newJobCapsService.getFieldById(fieldName.replace(/\.keyword$/, ''));
    isBothTypes = field !== null && field.type === ES_FIELD_TYPES.TEXT;
  } else if (fieldType !== undefined && fieldType === ES_FIELD_TYPES.TEXT) {
    //   If text, check if has corresponding keyword type
    const field = newJobCapsService.getFieldById(`${fieldName}.keyword`);
    isBothTypes = field !== null && field.type === ES_FIELD_TYPES.KEYWORD;
  }

  return isBothTypes;
};

// Used to sort columns:
// - string based columns are moved to the left
// - followed by the outlier_score column
// - feature_influence fields get moved next to the corresponding field column
// - overall fields get sorted alphabetically
export const sortColumns = (obj: EsDocSource, resultsField: string) => (a: string, b: string) => {
  const typeofA = typeof obj[a];
  const typeofB = typeof obj[b];

  if (typeofA !== 'string' && typeofB === 'string') {
    return 1;
  }
  if (typeofA === 'string' && typeofB !== 'string') {
    return -1;
  }
  if (typeofA === 'string' && typeofB === 'string') {
    return a.localeCompare(b);
  }

  if (a === `${resultsField}.outlier_score`) {
    return -1;
  }

  if (b === `${resultsField}.outlier_score`) {
    return 1;
  }

  const tokensA = a.split('.');
  const prefixA = tokensA[0];
  const tokensB = b.split('.');
  const prefixB = tokensB[0];

  if (prefixA === resultsField && tokensA.length > 1 && prefixB !== resultsField) {
    tokensA.shift();
    tokensA.shift();
    if (tokensA.join('.') === b) return 1;
    return tokensA.join('.').localeCompare(b);
  }

  if (prefixB === resultsField && tokensB.length > 1 && prefixA !== resultsField) {
    tokensB.shift();
    tokensB.shift();
    if (tokensB.join('.') === a) return -1;
    return a.localeCompare(tokensB.join('.'));
  }

  return a.localeCompare(b);
};

export const sortRegressionResultsFields = (
  a: string,
  b: string,
  jobConfig: DataFrameAnalyticsConfig
) => {
  const dependentVariable = getDependentVar(jobConfig.analysis);
  const resultsField = jobConfig.dest.results_field;
  const predictedField = getPredictedFieldName(resultsField, jobConfig.analysis, true);
  if (a === `${resultsField}.is_training`) {
    return -1;
  }
  if (b === `${resultsField}.is_training`) {
    return 1;
  }
  if (a === predictedField) {
    return -1;
  }
  if (b === predictedField) {
    return 1;
  }
  if (a === dependentVariable || a === dependentVariable.replace(/\.keyword$/, '')) {
    return -1;
  }
  if (b === dependentVariable || b === dependentVariable.replace(/\.keyword$/, '')) {
    return 1;
  }

  if (a === `${resultsField}.prediction_probability`) {
    return -1;
  }
  if (b === `${resultsField}.prediction_probability`) {
    return 1;
  }

  return a.localeCompare(b);
};

// Used to sort columns:
// Anchor on the left ml.is_training, <predictedField>, <actual>
export const sortRegressionResultsColumns = (
  obj: EsDocSource,
  jobConfig: DataFrameAnalyticsConfig
) => (a: string, b: string) => {
  const dependentVariable = getDependentVar(jobConfig.analysis);
  const resultsField = jobConfig.dest.results_field;
  const predictedField = getPredictedFieldName(resultsField, jobConfig.analysis, true);

  const typeofA = typeof obj[a];
  const typeofB = typeof obj[b];

  if (a === `${resultsField}.is_training`) {
    return -1;
  }

  if (b === `${resultsField}.is_training`) {
    return 1;
  }

  if (a === predictedField) {
    return -1;
  }

  if (b === predictedField) {
    return 1;
  }

  if (a === dependentVariable) {
    return -1;
  }

  if (b === dependentVariable) {
    return 1;
  }

  if (a === `${resultsField}.prediction_probability`) {
    return -1;
  }

  if (b === `${resultsField}.prediction_probability`) {
    return 1;
  }

  if (typeofA !== 'string' && typeofB === 'string') {
    return 1;
  }
  if (typeofA === 'string' && typeofB !== 'string') {
    return -1;
  }
  if (typeofA === 'string' && typeofB === 'string') {
    return a.localeCompare(b);
  }

  const tokensA = a.split('.');
  const prefixA = tokensA[0];
  const tokensB = b.split('.');
  const prefixB = tokensB[0];

  if (prefixA === resultsField && tokensA.length > 1 && prefixB !== resultsField) {
    tokensA.shift();
    tokensA.shift();
    if (tokensA.join('.') === b) return 1;
    return tokensA.join('.').localeCompare(b);
  }

  if (prefixB === resultsField && tokensB.length > 1 && prefixA !== resultsField) {
    tokensB.shift();
    tokensB.shift();
    if (tokensB.join('.') === a) return -1;
    return a.localeCompare(tokensB.join('.'));
  }

  return a.localeCompare(b);
};

export function getFlattenedFields(obj: EsDocSource, resultsField: string): EsFieldName[] {
  const flatDocFields: EsFieldName[] = [];
  const newDocFields = Object.keys(obj);
  newDocFields.forEach(f => {
    const fieldValue = getNestedProperty(obj, f);
    if (typeof fieldValue !== 'object' || fieldValue === null || Array.isArray(fieldValue)) {
      flatDocFields.push(f);
    } else {
      const innerFields = getFlattenedFields(fieldValue, resultsField);
      const flattenedFields = innerFields.map(d => `${f}.${d}`);
      flatDocFields.push(...flattenedFields);
    }
  });
  return flatDocFields.filter(f => f !== ML__ID_COPY);
}

export const getDefaultFieldsFromJobCaps = (
  fields: Field[],
  jobConfig: DataFrameAnalyticsConfig
): { selectedFields: Field[]; docFields: Field[]; depVarType?: ES_FIELD_TYPES } => {
  const fieldsObj = { selectedFields: [], docFields: [] };
  if (fields.length === 0) {
    return fieldsObj;
  }

  const dependentVariable = getDependentVar(jobConfig.analysis);
  const type = newJobCapsService.getFieldById(dependentVariable)?.type;
  const predictionFieldName = getPredictionFieldName(jobConfig.analysis);
  // default is 'ml'
  const resultsField = jobConfig.dest.results_field;

  const defaultPredictionField = `${dependentVariable}_prediction`;
  const predictedField = `${resultsField}.${
    predictionFieldName ? predictionFieldName : defaultPredictionField
  }`;

  const allFields: any = [
    {
      id: `${resultsField}.is_training`,
      name: `${resultsField}.is_training`,
      type: ES_FIELD_TYPES.BOOLEAN,
    },
    { id: predictedField, name: predictedField, type },
    ...fields,
  ].sort(({ name: a }, { name: b }) => sortRegressionResultsFields(a, b, jobConfig));

  let selectedFields = allFields
    .slice(0, DEFAULT_REGRESSION_COLUMNS * 2)
    .filter((field: any) => field.name === predictedField || !field.name.includes('.keyword'));

  if (selectedFields.length > DEFAULT_REGRESSION_COLUMNS) {
    selectedFields = selectedFields.slice(0, DEFAULT_REGRESSION_COLUMNS);
  }

  return {
    selectedFields,
    docFields: allFields,
    depVarType: type,
  };
};

export const getDefaultClassificationFields = (
  docs: EsDoc[],
  jobConfig: DataFrameAnalyticsConfig
): EsFieldName[] => {
  if (docs.length === 0) {
    return [];
  }
  const resultsField = jobConfig.dest.results_field;
  const newDocFields = getFlattenedFields(docs[0]._source, resultsField);
  return newDocFields
    .filter(k => {
      if (k === `${resultsField}.is_training`) {
        return true;
      }
      // predicted value of dependent variable
      if (k === getPredictedFieldName(resultsField, jobConfig.analysis, true)) {
        return true;
      }
      // actual value of dependent variable
      if (k === getDependentVar(jobConfig.analysis)) {
        return true;
      }

      if (k === `${resultsField}.prediction_probability`) {
        return true;
      }

      if (k.split('.')[0] === resultsField) {
        return false;
      }

      return docs.some(row => row._source[k] !== null);
    })
    .sort((a, b) => sortRegressionResultsFields(a, b, jobConfig))
    .slice(0, DEFAULT_REGRESSION_COLUMNS);
};

export const getDefaultRegressionFields = (
  docs: EsDoc[],
  jobConfig: DataFrameAnalyticsConfig
): EsFieldName[] => {
  const resultsField = jobConfig.dest.results_field;
  if (docs.length === 0) {
    return [];
  }

  const newDocFields = getFlattenedFields(docs[0]._source, resultsField);
  return newDocFields
    .filter(k => {
      if (k === `${resultsField}.is_training`) {
        return true;
      }
      // predicted value of dependent variable
      if (k === getPredictedFieldName(resultsField, jobConfig.analysis)) {
        return true;
      }
      // actual value of dependent variable
      if (k === getDependentVar(jobConfig.analysis)) {
        return true;
      }
      if (k.split('.')[0] === resultsField) {
        return false;
      }

      return docs.some(row => row._source[k] !== null);
    })
    .sort((a, b) => sortRegressionResultsFields(a, b, jobConfig))
    .slice(0, DEFAULT_REGRESSION_COLUMNS);
};

export const getDefaultSelectableFields = (docs: EsDoc[], resultsField: string): EsFieldName[] => {
  if (docs.length === 0) {
    return [];
  }

  const newDocFields = getFlattenedFields(docs[0]._source, resultsField);
  return newDocFields
    .filter(k => {
      if (k === `${resultsField}.outlier_score`) {
        return true;
      }
      if (k.split('.')[0] === resultsField) {
        return false;
      }

      return docs.some(row => row._source[k] !== null);
    })
    .slice(0, MAX_COLUMNS);
};

export const toggleSelectedFieldSimple = (
  selectedFields: EsFieldName[],
  column: EsFieldName
): EsFieldName[] => {
  const index = selectedFields.indexOf(column);

  if (index === -1) {
    selectedFields.push(column);
  } else {
    selectedFields.splice(index, 1);
  }
  return selectedFields;
};
// Fields starting with 'ml' or custom result name not included in newJobCapsService fields so
// need to recreate the field with correct type and add to selected fields
export const toggleSelectedField = (
  selectedFields: Field[],
  column: EsFieldName,
  resultsField: string,
  depVarType?: ES_FIELD_TYPES
): Field[] => {
  const index = selectedFields.map(field => field.name).indexOf(column);
  if (index === -1) {
    const columnField = newJobCapsService.getFieldById(column);
    if (columnField !== null) {
      selectedFields.push(columnField);
    } else {
      const resultFieldPattern = `^${resultsField}\.`;
      const regex = new RegExp(resultFieldPattern);
      const isResultField = column.match(regex) !== null;
      let newField;

      if (isResultField && column.includes('is_training')) {
        newField = {
          id: column,
          name: column,
          type: ES_FIELD_TYPES.BOOLEAN,
        };
      } else if (isResultField && depVarType !== undefined) {
        newField = {
          id: column,
          name: column,
          type: depVarType,
        };
      }

      if (newField) selectedFields.push(newField);
    }
  } else {
    selectedFields.splice(index, 1);
  }
  return selectedFields;
};

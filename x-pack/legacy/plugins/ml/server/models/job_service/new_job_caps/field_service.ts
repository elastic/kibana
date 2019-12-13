/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { Request } from 'src/legacy/server/kbn_server';
import {
  Field,
  Aggregation,
  FieldId,
  NewJobCaps,
  METRIC_AGG_TYPE,
} from '../../../../common/types/fields';
import { ES_FIELD_TYPES } from '../../../../../../../../src/plugins/data/server';
import { ML_JOB_AGGREGATION } from '../../../../common/constants/aggregation_types';
import { rollupServiceProvider, RollupJob, RollupFields } from './rollup';
import { aggregations, mlOnlyAggregations } from './aggregations';

const supportedTypes: string[] = [
  ES_FIELD_TYPES.DATE,
  ES_FIELD_TYPES.KEYWORD,
  ES_FIELD_TYPES.TEXT,
  ES_FIELD_TYPES.DOUBLE,
  ES_FIELD_TYPES.INTEGER,
  ES_FIELD_TYPES.FLOAT,
  ES_FIELD_TYPES.LONG,
  ES_FIELD_TYPES.BYTE,
  ES_FIELD_TYPES.HALF_FLOAT,
  ES_FIELD_TYPES.SCALED_FLOAT,
  ES_FIELD_TYPES.SHORT,
  ES_FIELD_TYPES.IP,
  ES_FIELD_TYPES.GEO_POINT,
  ES_FIELD_TYPES.GEO_SHAPE,
  ES_FIELD_TYPES.BOOLEAN,
];

export function fieldServiceProvider(
  indexPattern: string,
  isRollup: boolean,
  callWithRequest: any,
  request: Request
) {
  return new FieldsService(indexPattern, isRollup, callWithRequest, request);
}

class FieldsService {
  private _indexPattern: string;
  private _isRollup: boolean;
  private _callWithRequest: any;
  private _request: Request;

  constructor(indexPattern: string, isRollup: boolean, callWithRequest: any, request: Request) {
    this._indexPattern = indexPattern;
    this._isRollup = isRollup;
    this._callWithRequest = callWithRequest;
    this._request = request;
  }

  private async loadFieldCaps(): Promise<any> {
    return this._callWithRequest('fieldCaps', {
      index: this._indexPattern,
      fields: '*',
    });
  }

  // create field object from the results from _field_caps
  private async createFields(): Promise<Field[]> {
    const fieldCaps = await this.loadFieldCaps();
    const fields: Field[] = [];
    if (fieldCaps && fieldCaps.fields) {
      Object.keys(fieldCaps.fields).forEach((k: FieldId) => {
        const fc = fieldCaps.fields[k];
        const firstKey = Object.keys(fc)[0];
        if (firstKey !== undefined) {
          const field = fc[firstKey];
          // add to the list of fields if the field type can be used by ML
          if (supportedTypes.includes(field.type) === true) {
            fields.push({
              id: k,
              name: k,
              type: field.type,
              aggregatable: field.aggregatable,
              aggs: [],
            });
          }
        }
      });
    }
    return fields.sort((a, b) => a.id.localeCompare(b.id));
  }

  // public function to load fields from _field_caps and create a list
  // of aggregations and fields that can be used for an ML job
  // if the index is a rollup, the fields and aggs will be filtered
  // based on what is available in the rollup job
  // the _indexPattern will be replaced with a comma separated list
  // of index patterns from all of the rollup jobs
  public async getData(): Promise<NewJobCaps> {
    let rollupFields: RollupFields = {};

    if (this._isRollup) {
      const rollupService = await rollupServiceProvider(
        this._indexPattern,
        this._callWithRequest,
        this._request
      );
      const rollupConfigs: RollupJob[] | null = await rollupService.getRollupJobs();

      // if a rollup index has been specified, yet there are no
      // rollup configs, return with no results
      if (rollupConfigs === null) {
        return {
          aggs: [],
          fields: [],
        };
      } else {
        rollupFields = combineAllRollupFields(rollupConfigs);
        this._indexPattern = rollupService.getIndexPattern();
      }
    }

    const aggs = cloneDeep([...aggregations, ...mlOnlyAggregations]);
    const fields: Field[] = await this.createFields();

    return await combineFieldsAndAggs(fields, aggs, rollupFields);
  }
}

// cross reference fields and aggs.
// fields contain a list of aggs that are compatible, and vice versa.
async function combineFieldsAndAggs(
  fields: Field[],
  aggs: Aggregation[],
  rollupFields: RollupFields
): Promise<NewJobCaps> {
  const keywordFields = getKeywordFields(fields);
  const textFields = getTextFields(fields);
  const numericalFields = getNumericalFields(fields);
  const ipFields = getIpFields(fields);
  const geoFields = getGeoFields(fields);

  const isRollup = Object.keys(rollupFields).length > 0;
  const mix = mixFactory(isRollup, rollupFields);

  aggs.forEach(a => {
    if (a.type === METRIC_AGG_TYPE && a.fields !== undefined) {
      switch (a.id) {
        case ML_JOB_AGGREGATION.LAT_LONG:
          geoFields.forEach(f => mix(f, a));
          break;
        case ML_JOB_AGGREGATION.INFO_CONTENT:
        case ML_JOB_AGGREGATION.HIGH_INFO_CONTENT:
        case ML_JOB_AGGREGATION.LOW_INFO_CONTENT:
          textFields.forEach(f => mix(f, a));
        case ML_JOB_AGGREGATION.DISTINCT_COUNT:
        case ML_JOB_AGGREGATION.HIGH_DISTINCT_COUNT:
        case ML_JOB_AGGREGATION.LOW_DISTINCT_COUNT:
          // distinct count (i.e. cardinality) takes keywords, ips
          // as well as numerical fields
          keywordFields.forEach(f => mix(f, a));
          ipFields.forEach(f => mix(f, a));
        // note, no break to fall through to add numerical fields.
        default:
          // all other aggs take numerical fields
          numericalFields.forEach(f => {
            mix(f, a);
          });
          break;
      }
    }
  });

  return {
    aggs,
    fields: isRollup ? filterFields(fields) : fields,
  };
}

// remove fields that have no aggs associated to them, unless they are date fields
function filterFields(fields: Field[]): Field[] {
  return fields.filter(
    f => f.aggs && (f.aggs.length > 0 || (f.aggs.length === 0 && f.type === ES_FIELD_TYPES.DATE))
  );
}

// returns a mix function that is used to cross-reference aggs and fields.
// wrapped in a provider to allow filtering based on rollup job capabilities
function mixFactory(isRollup: boolean, rollupFields: RollupFields) {
  return function mix(field: Field, agg: Aggregation): void {
    if (
      isRollup === false ||
      (rollupFields[field.id] && rollupFields[field.id].find(f => f.agg === agg.dslName))
    ) {
      if (field.aggs !== undefined) {
        field.aggs.push(agg);
      }
      if (agg.fields !== undefined) {
        agg.fields.push(field);
      }
    }
  };
}

function combineAllRollupFields(rollupConfigs: RollupJob[]): RollupFields {
  const rollupFields: RollupFields = {};
  rollupConfigs.forEach(conf => {
    Object.keys(conf.fields).forEach(fieldName => {
      if (rollupFields[fieldName] === undefined) {
        rollupFields[fieldName] = conf.fields[fieldName];
      } else {
        const aggs = conf.fields[fieldName];
        aggs.forEach(agg => {
          if (rollupFields[fieldName].find(f => f.agg === agg.agg) === null) {
            rollupFields[fieldName].push(agg);
          }
        });
      }
    });
  });
  return rollupFields;
}

function getKeywordFields(fields: Field[]): Field[] {
  return fields.filter(f => f.type === ES_FIELD_TYPES.KEYWORD);
}

function getTextFields(fields: Field[]): Field[] {
  return fields.filter(f => f.type === ES_FIELD_TYPES.TEXT);
}

function getIpFields(fields: Field[]): Field[] {
  return fields.filter(f => f.type === ES_FIELD_TYPES.IP);
}

function getNumericalFields(fields: Field[]): Field[] {
  return fields.filter(
    f =>
      f.type === ES_FIELD_TYPES.LONG ||
      f.type === ES_FIELD_TYPES.INTEGER ||
      f.type === ES_FIELD_TYPES.SHORT ||
      f.type === ES_FIELD_TYPES.BYTE ||
      f.type === ES_FIELD_TYPES.DOUBLE ||
      f.type === ES_FIELD_TYPES.FLOAT ||
      f.type === ES_FIELD_TYPES.HALF_FLOAT ||
      f.type === ES_FIELD_TYPES.SCALED_FLOAT
  );
}

function getGeoFields(fields: Field[]): Field[] {
  return fields.filter(
    f => f.type === ES_FIELD_TYPES.GEO_POINT || f.type === ES_FIELD_TYPES.GEO_SHAPE
  );
}

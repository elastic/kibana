/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern, IndexPatterns } from 'ui/index_patterns';
import { SavedSearchLoader } from 'src/legacy/core_plugins/kibana/public/discover/types';

import {
  Field,
  Aggregation,
  AggId,
  FieldId,
  NewJobCaps,
  EVENT_RATE_FIELD_ID,
} from '../../common/types/fields';
import { ES_FIELD_TYPES } from '../../common/constants/field_types';
import {
  ML_JOB_AGGREGATION,
  KIBANA_AGGREGATION,
  ES_AGGREGATION,
} from '../../common/constants/aggregation_types';
import { ml } from './ml_api_service';

// called in the angular routing resolve block to initialize the
// newJobCapsService with the currently selected index pattern
export function loadNewJobCapabilities(
  indexPatterns: IndexPatterns,
  savedSearches: SavedSearchLoader,
  $route: Record<string, any>
) {
  return new Promise(async (resolve, reject) => {
    // get the index pattern id or saved search id from the url params
    const { index: indexPatternId, savedSearchId } = $route.current.params;

    if (indexPatternId !== undefined) {
      // index pattern is being used
      const indexPattern: IndexPattern = await indexPatterns.get(indexPatternId);
      await newJobCapsService.initializeFromIndexPattern(indexPattern);
      resolve(newJobCapsService.newJobCaps);
    } else if (savedSearchId !== undefined) {
      // saved search is being used
      // load the index pattern from the saved search
      const savedSearch = await savedSearches.get(savedSearchId);
      const indexPattern = savedSearch.searchSource.getField('index');
      await newJobCapsService.initializeFromIndexPattern(indexPattern);
      resolve(newJobCapsService.newJobCaps);
    } else {
      reject();
    }
  });
}

const categoryFieldTypes = [ES_FIELD_TYPES.TEXT, ES_FIELD_TYPES.KEYWORD, ES_FIELD_TYPES.IP];

class NewJobCapsService {
  private _fields: Field[];
  private _aggs: Aggregation[];
  private _includeCountAgg: boolean;

  constructor(includeCountAgg = true) {
    this._fields = [];
    this._aggs = [];
    this._includeCountAgg = includeCountAgg;
  }

  public get fields(): Field[] {
    return this._fields;
  }

  public get aggs(): Aggregation[] {
    return this._aggs;
  }

  public get newJobCaps(): NewJobCaps {
    return {
      fields: this._fields,
      aggs: this._aggs,
    };
  }

  public get categoryFields(): Field[] {
    return this._fields.filter(f => categoryFieldTypes.includes(f.type));
  }

  public async initializeFromIndexPattern(indexPattern: IndexPattern) {
    try {
      const resp = await ml.jobs.newJobCaps(indexPattern.title, indexPattern.type === 'rollup');
      const { fields, aggs } = createObjects(resp, indexPattern.title);

      if (this._includeCountAgg === true) {
        const { countField, countAggs } = createCountFieldAndAggs();

        fields.splice(0, 0, countField);
        aggs.push(...countAggs);
      }

      this._fields = fields;
      this._aggs = aggs;
    } catch (error) {
      console.error('Unable to load new job capabilities', error); // eslint-disable-line no-console
    }
  }

  public getFieldById(id: string): Field | null {
    const field = this._fields.find(f => f.id === id);
    return field === undefined ? null : field;
  }

  public getAggById(id: string): Aggregation | null {
    const agg = this._aggs.find(f => f.id === id);
    return agg === undefined ? null : agg;
  }
}

// using the response from the endpoint, create the field and aggs objects
// when transported over the endpoint, the fields and aggs contain lists of ids of the
// fields and aggs they are related to.
// this function creates lists of real Fields and Aggregations and cross references them.
// the list if ids are then deleted.
function createObjects(resp: any, indexPatternTitle: string) {
  const results = resp[indexPatternTitle];

  const fields: Field[] = [];
  const aggs: Aggregation[] = [];
  // for speed, a map of aggregations, keyed on their id

  // create a AggMap type to allow an enum (AggId) to be used as a Record key and then initialized with {}
  type AggMap = Record<AggId, Aggregation>;
  const aggMap: AggMap = {} as AggMap;
  // for speed, a map of aggregation id lists from a field, keyed on the field id
  const aggIdMap: Record<FieldId, AggId[]> = {};

  if (results !== undefined) {
    results.aggs.forEach((a: Aggregation) => {
      // copy the agg and add a Fields list
      const agg: Aggregation = {
        ...a,
        fields: [],
      };
      aggMap[agg.id] = agg;
      aggs.push(agg);
    });

    results.fields.forEach((f: Field) => {
      // copy the field and add an Aggregations list
      const field: Field = {
        ...f,
        aggs: [],
      };
      if (field.aggIds !== undefined) {
        aggIdMap[field.id] = field.aggIds;
      }
      fields.push(field);
    });

    // loop through the fields and populate their aggs lists.
    // for each agg added to a field, also add that field to the agg's field list
    fields.forEach((field: Field) => {
      aggIdMap[field.id].forEach((aggId: AggId) => {
        mix(field, aggMap[aggId]);
      });
    });
  }

  // the aggIds and fieldIds lists are no longer needed as we've created
  // lists of real fields and aggs
  fields.forEach(f => delete f.aggIds);
  aggs.forEach(a => delete a.fieldIds);

  return {
    fields,
    aggs,
  };
}

function mix(field: Field, agg: Aggregation) {
  if (agg.fields === undefined) {
    agg.fields = [];
  }
  if (field.aggs === undefined) {
    field.aggs = [];
  }
  agg.fields.push(field);
  field.aggs.push(agg);
}

function createCountFieldAndAggs() {
  const countField: Field = {
    id: EVENT_RATE_FIELD_ID,
    name: 'Event rate',
    type: ES_FIELD_TYPES.INTEGER,
    aggregatable: true,
    aggs: [],
  };

  const countAggs: Aggregation[] = [
    {
      id: ML_JOB_AGGREGATION.COUNT,
      title: 'Count',
      kibanaName: KIBANA_AGGREGATION.COUNT,
      dslName: ES_AGGREGATION.COUNT,
      type: 'metrics',
      mlModelPlotAgg: {
        min: 'min',
        max: 'max',
      },
      fields: [countField],
    },
    {
      id: ML_JOB_AGGREGATION.HIGH_COUNT,
      title: 'High count',
      kibanaName: KIBANA_AGGREGATION.COUNT,
      dslName: ES_AGGREGATION.COUNT,
      type: 'metrics',
      mlModelPlotAgg: {
        min: 'min',
        max: 'max',
      },
      fields: [countField],
    },
    {
      id: ML_JOB_AGGREGATION.LOW_COUNT,
      title: 'Low count',
      kibanaName: KIBANA_AGGREGATION.COUNT,
      dslName: ES_AGGREGATION.COUNT,
      type: 'metrics',
      mlModelPlotAgg: {
        min: 'min',
        max: 'max',
      },
      fields: [countField],
    },
  ];

  if (countField.aggs !== undefined) {
    countField.aggs.push(...countAggs);
  }

  return {
    countField,
    countAggs,
  };
}

export const newJobCapsService = new NewJobCapsService();

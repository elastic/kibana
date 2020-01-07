/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';
import { IndexPatternTitle } from '../../../../../../common/types/kibana';
import { CategorizationJobCreator } from '../job_creator';
import { ml } from '../../../../services/ml_api_service';

const NUM_OF_EXAMPLES = 5;

export interface Token {
  token: string;
  start_offset: number;
  end_offset: number;
  type: string;
  position: number;
}

export interface CategoryExample {
  text: string;
  tokens: Token[];
}

export class CategorizationExamplesLoader {
  private _jobCreator: CategorizationJobCreator;
  private _indexPatternTitle: IndexPatternTitle = '';
  private _timeFieldName: string = '';
  private _query: object = {};

  constructor(jobCreator: CategorizationJobCreator, indexPattern: IndexPattern, query: object) {
    this._jobCreator = jobCreator;
    this._indexPatternTitle = indexPattern.title;
    this._query = query;

    if (typeof indexPattern.timeFieldName === 'string') {
      this._timeFieldName = indexPattern.timeFieldName;
    }
  }

  public async loadExamples() {
    const analyzer = this._jobCreator.categorizationAnalyzer;
    const categorizationFieldName = this._jobCreator.categorizationFieldName;
    if (categorizationFieldName === null) {
      return { valid: 0, examples: [] };
    }

    const start = Math.floor(
      this._jobCreator.start + (this._jobCreator.end - this._jobCreator.start) / 2
    );
    const resp = await ml.jobs.categorizationFieldExamples(
      this._indexPatternTitle,
      this._query,
      NUM_OF_EXAMPLES,
      categorizationFieldName,
      this._timeFieldName,
      start,
      0,
      analyzer
    );
    return resp;
  }
}

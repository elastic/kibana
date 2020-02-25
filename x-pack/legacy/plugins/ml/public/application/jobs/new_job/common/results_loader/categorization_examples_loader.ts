/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPattern } from '../../../../../../../../../../src/plugins/data/public';
import { IndexPatternTitle } from '../../../../../../common/types/kibana';
import { CategorizationJobCreator } from '../job_creator';
import { ml } from '../../../../services/ml_api_service';
import {
  NUMBER_OF_CATEGORY_EXAMPLES,
  CATEGORY_EXAMPLES_VALIDATION_STATUS,
} from '../../../../../../common/constants/new_job';

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
      return {
        examples: [],
        sampleSize: 0,
        overallValidStatus: CATEGORY_EXAMPLES_VALIDATION_STATUS.INVALID,
        validationChecks: [],
      };
    }

    const resp = await ml.jobs.categorizationFieldExamples(
      this._indexPatternTitle,
      this._query,
      NUMBER_OF_CATEGORY_EXAMPLES,
      categorizationFieldName,
      this._timeFieldName,
      this._jobCreator.start,
      this._jobCreator.end,
      analyzer
    );
    return resp;
  }
}

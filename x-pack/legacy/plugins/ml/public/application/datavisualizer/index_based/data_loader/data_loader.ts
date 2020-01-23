/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { toastNotifications } from 'ui/notify';
import { IndexPattern } from '../../../../../../../../../src/plugins/data/public';

import { SavedSearchQuery } from '../../../contexts/kibana';
import { IndexPatternTitle } from '../../../../../common/types/kibana';

import { ml } from '../../../services/ml_api_service';
import { FieldRequestConfig } from '../common';

// List of system fields we don't want to display.
const OMIT_FIELDS: string[] = ['_source', '_type', '_index', '_id', '_version', '_score'];
// Maximum number of examples to obtain for text type fields.
const MAX_EXAMPLES_DEFAULT: number = 10;

export class DataLoader {
  private _indexPattern: IndexPattern;
  private _indexPatternTitle: IndexPatternTitle = '';
  private _maxExamples: number = MAX_EXAMPLES_DEFAULT;

  constructor(indexPattern: IndexPattern, kibanaConfig: any) {
    this._indexPattern = indexPattern;
    this._indexPatternTitle = indexPattern.title;
  }

  async loadOverallData(
    query: string | SavedSearchQuery,
    samplerShardSize: number,
    earliest: number | undefined,
    latest: number | undefined
  ): Promise<any> {
    const aggregatableFields: string[] = [];
    const nonAggregatableFields: string[] = [];
    this._indexPattern.fields.forEach(field => {
      const fieldName = field.displayName !== undefined ? field.displayName : field.name;
      if (this.isDisplayField(fieldName) === true) {
        if (field.aggregatable === true) {
          aggregatableFields.push(fieldName);
        } else {
          nonAggregatableFields.push(fieldName);
        }
      }
    });

    // Need to find:
    // 1. List of aggregatable fields that do exist in docs
    // 2. List of aggregatable fields that do not exist in docs
    // 3. List of non-aggregatable fields that do exist in docs.
    // 4. List of non-aggregatable fields that do not exist in docs.
    const stats = await ml.getVisualizerOverallStats({
      indexPatternTitle: this._indexPatternTitle,
      query,
      timeFieldName: this._indexPattern.timeFieldName,
      samplerShardSize,
      earliest,
      latest,
      aggregatableFields,
      nonAggregatableFields,
    });

    return stats;
  }

  async loadFieldStats(
    query: string | SavedSearchQuery,
    samplerShardSize: number,
    earliest: number | undefined,
    latest: number | undefined,
    fields: FieldRequestConfig[],
    interval?: string
  ): Promise<any[]> {
    const stats = await ml.getVisualizerFieldStats({
      indexPatternTitle: this._indexPatternTitle,
      query,
      timeFieldName: this._indexPattern.timeFieldName,
      earliest,
      latest,
      samplerShardSize,
      interval,
      fields,
      maxExamples: this._maxExamples,
    });

    return stats;
  }

  displayError(err: any) {
    if (err.statusCode === 500) {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.datavisualizer.dataLoader.internalServerErrorMessage', {
          defaultMessage:
            'Error loading data in index {index}. {message}. ' +
            'The request may have timed out. Try using a smaller sample size or narrowing the time range.',
          values: {
            index: this._indexPattern.title,
            message: err.message,
          },
        })
      );
    } else {
      toastNotifications.addDanger(
        i18n.translate('xpack.ml.datavisualizer.page.errorLoadingDataMessage', {
          defaultMessage: 'Error loading data in index {index}. {message}',
          values: {
            index: this._indexPattern.title,
            message: err.message,
          },
        })
      );
    }
  }

  public set maxExamples(max: number) {
    this._maxExamples = max;
  }

  public get maxExamples(): number {
    return this._maxExamples;
  }

  // Returns whether the field with the specified name should be displayed,
  // as certain fields such as _id and _source should be omitted from the view.
  public isDisplayField(fieldName: string): boolean {
    return !OMIT_FIELDS.includes(fieldName);
  }
}

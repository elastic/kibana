/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import {
  type Field,
  type Aggregation,
  type SplitField,
  type AggFieldPair,
} from '@kbn/ml-anomaly-utils';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job, Detector, BucketSpan } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import { getDefaultDSLQuery } from '@kbn/ml-query-utils';
import type { MlApi } from '../../../../services/ml_api_service';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { JobCreator } from './job_creator';
import { createBasicDetector } from './util/default_configs';
import { JOB_TYPE, CREATED_BY_LABEL } from '../../../../../../common/constants/new_job';

/** Job creator for the ES|QL wizard, which starts without a data view. */
export class EsqlJobCreator extends JobCreator {
  protected _type: JOB_TYPE = JOB_TYPE.ESQL;
  private _indexPattern: DataView | null = null;
  // like a multi-metric job, an optional partition field shared by all detectors
  private _splitField: SplitField = null;
  private _isBucketSpanFromQuery = false;

  constructor(mlApi: MlApi, newJobCapsService: NewJobCapsService) {
    super(mlApi, newJobCapsService);
    this.createdBy = CREATED_BY_LABEL.ESQL;
    // ES|QL datafeeds read data with esql_query, so they have no DSL query or indices
    delete this._datafeed_config.query;
    delete (this._datafeed_config as Partial<Datafeed>).indices;
    this.summaryCountFieldName = null;
    this._wizardInitialized$.next(true);
  }

  public get esqlQuery(): string {
    return this._datafeed_config.esql_query ?? '';
  }

  public set esqlQuery(query: string) {
    this._datafeed_config.esql_query = query;
  }

  /** Match-all query for the charts and bucket span estimate, which search the query's source indices. */
  public get query(): object {
    return getDefaultDSLQuery();
  }

  /** Ignored, as the datafeed has no DSL query. */
  public set query(_query: object) {}

  public get bucketSpan(): BucketSpan {
    return super.bucketSpan;
  }

  /** Also sets the datafeed's grouping_interval, which Elasticsearch still requires for ES|QL datafeeds. */
  public set bucketSpan(bucketSpan: BucketSpan) {
    super.bucketSpan = bucketSpan;
    if (bucketSpan === '') {
      delete this._datafeed_config.grouping_interval;
    } else {
      this._datafeed_config.grouping_interval = String(bucketSpan);
    }
  }

  /** Whether the bucket span is set by the query's BUCKET interval, so it cannot be edited. */
  public get isBucketSpanFromQuery(): boolean {
    return this._isBucketSpanFromQuery;
  }

  /** Sets the bucket span to the query's BUCKET interval, or unlocks it when the query has none. */
  public setBucketSpanFromQuery(bucketSpan: string | null) {
    this._isBucketSpanFromQuery = bucketSpan !== null;
    if (bucketSpan !== null) {
      this.bucketSpan = bucketSpan;
    }
  }

  public get timeFieldName(): string {
    return super.timeFieldName;
  }

  /** Also sets the datafeed's source_time_field, which Elasticsearch still requires for ES|QL datafeeds. */
  public set timeFieldName(fieldName: string) {
    super.timeFieldName = fieldName;
    if (fieldName === '') {
      delete this._datafeed_config.source_time_field;
    } else {
      this._datafeed_config.source_time_field = fieldName;
    }
  }

  public get summaryCountFieldName(): string | null {
    return super.summaryCountFieldName;
  }

  /**
   * Sets the query's document count column. The datafeed's delayed data check needs this column,
   * so it is turned on with one and off without one.
   */
  public set summaryCountFieldName(fieldName: string | null) {
    super.summaryCountFieldName = fieldName;
    this._datafeed_config.delayed_data_check_config = { enabled: fieldName !== null };
  }

  public get dataView(): DataView | null {
    return this._indexPattern;
  }
  // !!!!!!!!!!!!!!!! this needs to be more flexible, more like population job creator
  /** Sets the temporary data view created from the ES|QL query's source. */
  public set indexPattern(dataView: DataView) {
    this._indexPattern = dataView;
    const title = dataView.getIndexPattern();
    const name = dataView.getName();
    this._indexPatternTitle = title;
    this._indexPatternDisplayName = name === title ? name : `${name} (${title})`;
  }

  public setSplitField(field: SplitField) {
    this._splitField = field;

    if (this._splitField === null) {
      this.removeSplitField();
    } else {
      for (const detector of this._detectors) {
        detector.partition_field_name = this._splitField.id;
      }
    }
  }

  public removeSplitField() {
    this._detectors.forEach((d) => {
      delete d.partition_field_name;
    });
  }

  public get splitField(): SplitField {
    return this._splitField;
  }

  public addDetector(agg: Aggregation, field: Field) {
    this._addDetector(this._createDetector(agg, field), agg, field);
  }

  public editDetector(agg: Aggregation, field: Field, index: number) {
    this._editDetector(this._createDetector(agg, field), agg, field, index);
  }

  public removeDetector(index: number) {
    this._removeDetector(index);
  }

  public get aggFieldPairs(): AggFieldPair[] {
    return this.detectors.map((d, i) => ({
      field: this._fields[i],
      agg: this._aggs[i],
    }));
  }

  private _createDetector(agg: Aggregation, field: Field): Detector {
    const detector: Detector = createBasicDetector(agg, field);
    if (this._splitField !== null) {
      detector.partition_field_name = this._splitField.id;
    }
    return detector;
  }

  public cloneFromExistingJob(job: Job, datafeed: Datafeed) {
    this._overrideConfigs(job, datafeed);
    delete this._datafeed_config.query;
    delete (this._datafeed_config as Partial<Datafeed>).indices;
    this.createdBy = CREATED_BY_LABEL.ESQL;
  }
}

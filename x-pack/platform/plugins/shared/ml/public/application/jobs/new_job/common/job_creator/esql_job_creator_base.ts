/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { ML_JOB_AGGREGATION } from '@kbn/ml-anomaly-utils';
import type { Datafeed } from '@kbn/ml-common-types/anomaly_detection_jobs/datafeed';
import type { Job, BucketSpan } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import { getDefaultDSLQuery } from '@kbn/ml-query-utils';
import type { MlApi } from '../../../../services/ml_api_service';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import type { EsqlColumn } from '../../../../services/new_job_capabilities/esql_columns_to_fields';
import { JobCreator } from './job_creator';

/**
 * Base job creator for the ES|QL wizards, which start without a data view. Its fields are the
 * output columns of the ES|QL query.
 */
export abstract class EsqlJobCreatorBase extends JobCreator {
  private _indexPattern: DataView | null = null;
  private _isBucketSpanFromQuery = false;
  private _hasEsqlColumns = false;

  constructor(mlApi: MlApi, newJobCapsService: NewJobCapsService) {
    super(mlApi, newJobCapsService);
    // ES|QL datafeeds read data with esql_query, so they have no DSL query or indices
    this._deleteDslDatafeedSettings();
    this.summaryCountFieldName = null;
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

  /** Sets the temporary data view created from the ES|QL query's source. */
  public set indexPattern(dataView: DataView) {
    this._indexPattern = dataView;
    const title = dataView.getIndexPattern();
    const name = dataView.getName();
    this._indexPatternTitle = title;
    this._indexPatternDisplayName = name === title ? name : `${name} (${title})`;
  }

  /**
   * Makes the query's output columns the fields the job can use, and rebuilds the detectors'
   * fields and functions from them.
   * @param columns - the query's output columns
   * @param columnFunctions - the ML functions allowed for columns created by the query's STATS
   */
  public setEsqlColumns(
    columns: readonly EsqlColumn[],
    columnFunctions: Readonly<Record<string, readonly ML_JOB_AGGREGATION[]>>
  ) {
    this.newJobCapsService.initializeFromEsqlColumns(columns, columnFunctions);
    this._hasEsqlColumns = true;
    this._restoreDetectors();
  }

  /**
   * Rebuilds the detectors' fields and functions from the job config. Detectors whose fields are
   * not columns of the query are removed.
   */
  protected abstract _restoreDetectors(): void;

  /** Replaces the job and datafeed configs, e.g. when cloning a job or saving edited JSON. */
  protected _overrideEsqlConfigs(job: Job, datafeed: Datafeed) {
    this._overrideConfigs(job, datafeed);
    this._deleteDslDatafeedSettings();
    // until the query step has run, the job's fields are not known, so the detectors are
    // restored when the query's columns are set
    if (this._hasEsqlColumns) {
      this._restoreDetectors();
    }
  }

  private _deleteDslDatafeedSettings() {
    delete this._datafeed_config.query;
    delete (this._datafeed_config as Partial<Datafeed>).indices;
  }
}

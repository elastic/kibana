/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedSearch } from 'src/legacy/core_plugins/kibana/public/discover/types';
import { IndexPatternWithType, IndexPatternTitle } from '../../../../../common/types/kibana';
import { Job, Datafeed, Detector, JobId, DatafeedId, BucketSpan } from './configs';
import { Aggregation } from '../../../../../common/types/fields';
import { createEmptyJob, createEmptyDatafeed } from './util/default_configs';
import { mlJobService } from '../../../../services/job_service';
import { JobRunner, ProgressSubscriber } from '../job_runner';
import { JOB_TYPE } from './util/constants';

export class JobCreator {
  protected _type: JOB_TYPE = JOB_TYPE.SINGLE_METRIC;
  protected _indexPattern: IndexPatternWithType;
  protected _savedSearch: SavedSearch;
  protected _indexPatternTitle: IndexPatternTitle = '';
  protected _job_config: Job;
  protected _datafeed_config: Datafeed;
  protected _detectors: Detector[];
  protected _influencers: string[];
  protected _useDedicatedIndex: boolean = false;
  protected _start: number = 0;
  protected _end: number = 0;
  protected _subscribers: ProgressSubscriber[];
  protected _aggs: Aggregation[] = [];
  private _stopAllRefreshPolls: {
    stop: boolean;
  };

  constructor(indexPattern: IndexPatternWithType, savedSearch: SavedSearch, query: object) {
    this._indexPattern = indexPattern;
    this._savedSearch = savedSearch;
    this._indexPatternTitle = indexPattern.title;

    this._job_config = createEmptyJob();
    this._datafeed_config = createEmptyDatafeed(this._indexPatternTitle);
    this._detectors = this._job_config.analysis_config.detectors;
    this._influencers = this._job_config.analysis_config.influencers;

    if (typeof indexPattern.timeFieldName === 'string') {
      this._job_config.data_description.time_field = indexPattern.timeFieldName;
    }

    this._datafeed_config.query = query;
    this._subscribers = [];
    this._stopAllRefreshPolls = { stop: false };
  }

  public get type(): JOB_TYPE {
    return this._type;
  }

  protected _addDetector(detector: Detector, agg: Aggregation) {
    this._detectors.push(detector);
    this._aggs.push(agg);
  }

  protected _editDetector(detector: Detector, agg: Aggregation, index: number) {
    if (this._detectors[index] !== undefined) {
      this._detectors[index] = detector;
      this._aggs[index] = agg;
    }
  }

  protected _removeDetector(index: number) {
    this._detectors.splice(index, 1);
    this._aggs.splice(index, 1);
  }

  public removeAllDetectors() {
    this._detectors.length = 0;
  }

  public get detectors(): Detector[] {
    return this._detectors;
  }

  public get aggregationsInDetectors(): Aggregation[] {
    return this._aggs;
  }

  public getAggregation(index: number): Aggregation | null {
    const agg = this._aggs[index];
    return agg !== undefined ? agg : null;
  }

  public set bucketSpan(bucketSpan: BucketSpan) {
    this._job_config.analysis_config.bucket_span = bucketSpan;
  }

  public get bucketSpan(): BucketSpan {
    return this._job_config.analysis_config.bucket_span;
  }

  public addInfluencer(influencer: string) {
    if (this._influencers.includes(influencer) === false) {
      this._influencers.push(influencer);
    }
  }

  public removeInfluencer(influencer: string) {
    const idx = this._influencers.indexOf(influencer);
    if (idx !== -1) {
      this._influencers.splice(idx, 1);
    }
  }

  public removeAllInfluencers() {
    this._influencers.length = 0;
  }

  public get influencers(): string[] {
    return this._influencers;
  }

  public set jobId(jobId: JobId) {
    this._job_config.job_id = jobId;
    this._datafeed_config.job_id = jobId;
    this._datafeed_config.datafeed_id = `datafeed-${jobId}`;

    if (this._useDedicatedIndex) {
      this._job_config.results_index_name = jobId;
    }
  }

  public get jobId(): JobId {
    return this._job_config.job_id;
  }

  public get datafeedId(): DatafeedId {
    return this._datafeed_config.datafeed_id;
  }

  public set description(description: string) {
    this._job_config.description = description;
  }

  public get description(): string {
    return this._job_config.description;
  }

  public addGroup(group: string) {
    if (this._job_config.groups.includes(group) === false) {
      this._job_config.groups.push(group);
    }
  }

  public get groups(): string[] {
    return this._job_config.groups;
  }

  public set groups(groups: string[]) {
    this._job_config.groups = groups;
  }

  public set modelPlot(enable: boolean) {
    if (enable) {
      this._job_config.model_plot_config = {
        enabled: true,
      };
    } else {
      delete this._job_config.model_plot_config;
    }
  }

  public get modelPlot() {
    return (
      this._job_config.model_plot_config !== undefined &&
      this._job_config.model_plot_config.enabled === true
    );
  }

  public set useDedicatedIndex(enable: boolean) {
    this._useDedicatedIndex = enable;
    if (enable) {
      this._job_config.results_index_name = this._job_config.job_id;
    } else {
      delete this._job_config.results_index_name;
    }
  }

  public get useDedicatedIndex(): boolean {
    return this._useDedicatedIndex;
  }

  public set modelMemoryLimit(mml: number | string | null) {
    if (mml !== null) {
      this._job_config.analysis_limits = {
        model_memory_limit: mml,
      };
    } else {
      delete this._job_config.analysis_limits;
    }
  }

  public get modelMemoryLimit(): number | string | null {
    if (this._job_config.analysis_limits) {
      return this._job_config.analysis_limits.model_memory_limit;
    } else {
      return null;
    }
  }

  public setTimeRange(start: number, end: number) {
    this._start = start;
    this._end = end;
  }

  public get start(): number {
    return this._start;
  }

  public get end(): number {
    return this._end;
  }

  public get query(): object {
    return this._datafeed_config.query;
  }

  public set query(query: object) {
    this._datafeed_config.query = query;
  }

  public get subscribers(): ProgressSubscriber[] {
    return this._subscribers;
  }

  public async createAndStartJob() {
    try {
      await this.createJob();
      await this.createDatafeed();
      await this.startDatafeed();
    } catch (error) {
      throw error;
    }
  }

  public async createJob(): Promise<object> {
    try {
      return await mlJobService.saveNewJob(this._job_config);
    } catch (error) {
      throw error;
    }
  }

  public async createDatafeed(): Promise<object> {
    try {
      return await mlJobService.saveNewDatafeed(this._datafeed_config, this._job_config.job_id);
    } catch (error) {
      throw error;
    }
  }

  // create a jobRunner instance, start it and return it
  public async startDatafeed(): Promise<JobRunner> {
    const jobRunner = new JobRunner(this);
    jobRunner.startDatafeed();
    return jobRunner;
  }

  public subscribeToProgress(func: ProgressSubscriber) {
    this._subscribers.push(func);
  }

  public get jobConfig(): Job {
    return this._job_config;
  }

  public get datafeedConfig(): Datafeed {
    return this._datafeed_config;
  }

  public get stopAllRefreshPolls(): { stop: boolean } {
    return this._stopAllRefreshPolls;
  }

  public forceStopRefreshPolls() {
    this._stopAllRefreshPolls.stop = true;
  }

  private _setCustomSetting(setting: string, value: string | object | null) {
    if (value === null) {
      // if null is passed in, delete the custom setting
      if (
        this._job_config.custom_settings !== undefined &&
        this._job_config.custom_settings[setting] !== undefined
      ) {
        delete this._job_config.custom_settings[setting];

        if (Object.keys(this._job_config.custom_settings).length === 0) {
          // clean up custom_settings if there's nothing else in there
          delete this._job_config.custom_settings;
        }
      }
    } else {
      if (this._job_config.custom_settings === undefined) {
        // if custom_settings doesn't exist, create it.
        this._job_config.custom_settings = {
          [setting]: value,
        };
      } else {
        this._job_config.custom_settings[setting] = value;
      }
    }
  }

  private _getCustomSetting(setting: string): string | object | null {
    if (
      this._job_config.custom_settings !== undefined &&
      this._job_config.custom_settings[setting] !== undefined
    ) {
      return this._job_config.custom_settings[setting];
    }
    return null;
  }

  public set createdBy(createdBy: string | null) {
    this._setCustomSetting('created_by', createdBy);
  }

  public get createdBy(): string | null {
    return this._getCustomSetting('created_by') as string | null;
  }

  public get formattedJobJson() {
    return JSON.stringify(this._job_config, null, 2);
  }

  public get formattedDatafeedJson() {
    return JSON.stringify(this._datafeed_config, null, 2);
  }
}

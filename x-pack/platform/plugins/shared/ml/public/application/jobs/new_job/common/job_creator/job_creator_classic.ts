/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { RuntimeMappings } from '@kbn/ml-runtime-field-utils';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { MlApi } from '../../../../services/ml_api_service';
import type { NewJobCapsService } from '../../../../services/new_job_capabilities/new_job_capabilities_service';
import { getQueryFromSavedSearchObject } from '../../../../util/index_utils';
import { JobCreator } from './job_creator';
import { createEmptyDatafeed } from './util/default_configs';

/** Base job creator for wizards whose datafeed is built from a data view or saved search. */
export class JobCreatorClassic extends JobCreator {
  protected _indexPattern: DataView;
  protected _savedSearch: SavedSearch | null;

  constructor(
    mlApi: MlApi,
    newJobCapsService: NewJobCapsService,
    indexPattern: DataView,
    savedSearch: SavedSearch | null,
    query: object
  ) {
    super(mlApi, newJobCapsService);
    this._indexPattern = indexPattern;
    this._savedSearch = savedSearch;

    const title = this._indexPattern.title;
    const name = this._indexPattern.getName();
    this._indexPatternDisplayName = name === title ? name : `${name} (${title})`;
    this._indexPatternTitle = title;

    this._datafeed_config = createEmptyDatafeed(this._indexPatternTitle);

    if (typeof indexPattern.timeFieldName === 'string') {
      this._job_config.data_description.time_field = indexPattern.timeFieldName;
    }

    this._extractRuntimeMappings();

    this._datafeed_config.query = query;
  }

  public get savedSearch(): SavedSearch | null {
    return this._savedSearch;
  }

  public get dataView(): DataView {
    return this._indexPattern;
  }

  public get dataViewId(): string | undefined {
    return this._indexPattern.id;
  }

  public get savedSearchQuery(): { query: Query; filter: any[] } | null {
    return this._savedSearch ? getQueryFromSavedSearchObject(this._savedSearch) : null;
  }

  private _extractRuntimeMappings() {
    const runtimeFieldMap = this._indexPattern.toSpec().runtimeFieldMap as
      | RuntimeMappings
      | undefined;
    if (runtimeFieldMap !== undefined) {
      if (this._datafeed_config.runtime_mappings === undefined) {
        this._datafeed_config.runtime_mappings = {};
      }
      Object.entries(runtimeFieldMap).forEach(([key, val]) => {
        this._datafeed_config.runtime_mappings![key] = val;
      });
    }
    this._populateRuntimeFields();
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { ManagementAppLocator } from '@kbn/management-plugin/common';
import { LocatorPublic, LocatorDefinition, KibanaLocation } from '@kbn/share-plugin/public';
import {
  getClonePath,
  getCreatePath,
  getEditPath,
  getListPath,
} from './application/services/navigation';
import { PLUGIN_ID } from '../common/constants';

export enum INGEST_PIPELINES_PAGES {
  LIST = 'pipelines_list',
  EDIT = 'pipeline_edit',
  CREATE = 'pipeline_create',
  CLONE = 'pipeline_clone',
}

interface IngestPipelinesBaseParams extends SerializableRecord {
  pipelineId: string;
}
export interface IngestPipelinesListParams extends Partial<IngestPipelinesBaseParams> {
  page: INGEST_PIPELINES_PAGES.LIST;
}

export interface IngestPipelinesEditParams extends IngestPipelinesBaseParams {
  page: INGEST_PIPELINES_PAGES.EDIT;
}

export interface IngestPipelinesCloneParams extends IngestPipelinesBaseParams {
  page: INGEST_PIPELINES_PAGES.CLONE;
}

export interface IngestPipelinesCreateParams extends IngestPipelinesBaseParams {
  page: INGEST_PIPELINES_PAGES.CREATE;
}

export type IngestPipelinesParams =
  | IngestPipelinesListParams
  | IngestPipelinesEditParams
  | IngestPipelinesCloneParams
  | IngestPipelinesCreateParams;

export type IngestPipelinesLocator = LocatorPublic<IngestPipelinesParams>;

export const INGEST_PIPELINES_APP_LOCATOR = 'INGEST_PIPELINES_APP_LOCATOR';

export interface IngestPipelinesLocatorDependencies {
  managementAppLocator: ManagementAppLocator;
}

export class IngestPipelinesLocatorDefinition implements LocatorDefinition<IngestPipelinesParams> {
  public readonly id = INGEST_PIPELINES_APP_LOCATOR;

  constructor(protected readonly deps: IngestPipelinesLocatorDependencies) {}

  public readonly getLocation = async (params: IngestPipelinesParams): Promise<KibanaLocation> => {
    const location = await this.deps.managementAppLocator.getLocation({
      sectionId: 'ingest',
      appId: PLUGIN_ID,
    });

    let path: string = '';

    switch (params.page) {
      case INGEST_PIPELINES_PAGES.EDIT:
        path = getEditPath({
          pipelineName: params.pipelineId,
        });
        break;
      case INGEST_PIPELINES_PAGES.CREATE:
        path = getCreatePath();
        break;
      case INGEST_PIPELINES_PAGES.LIST:
        path = getListPath({
          inspectedPipelineName: params.pipelineId,
        });
        break;
      case INGEST_PIPELINES_PAGES.CLONE:
        path = getClonePath({
          clonedPipelineName: params.pipelineId,
        });
        break;
    }

    return {
      ...location,
      path: path === '/' ? location.path : location.path + path,
    };
  };
}

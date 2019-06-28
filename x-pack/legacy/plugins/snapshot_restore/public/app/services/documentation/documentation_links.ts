/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { REPOSITORY_TYPES } from '../../../../common/constants';
import { RepositoryType } from '../../../../common/types';
import { REPOSITORY_DOC_PATHS } from '../../constants';

class DocumentationLinksService {
  private esDocBasePath: string = '';
  private esPluginDocBasePath: string = '';

  public init(esDocBasePath: string, esPluginDocBasePath: string): void {
    this.esDocBasePath = esDocBasePath;
    this.esPluginDocBasePath = esPluginDocBasePath;
  }

  public getRepositoryPluginDocUrl() {
    return `${this.esPluginDocBasePath}${REPOSITORY_DOC_PATHS.plugins}`;
  }

  public getRepositoryTypeDocUrl(type?: RepositoryType) {
    switch (type) {
      case REPOSITORY_TYPES.fs:
        return `${this.esDocBasePath}${REPOSITORY_DOC_PATHS.fs}`;
      case REPOSITORY_TYPES.url:
        return `${this.esDocBasePath}${REPOSITORY_DOC_PATHS.url}`;
      case REPOSITORY_TYPES.source:
        return `${this.esDocBasePath}${REPOSITORY_DOC_PATHS.source}`;
      case REPOSITORY_TYPES.s3:
        return `${this.esPluginDocBasePath}${REPOSITORY_DOC_PATHS.s3}`;
      case REPOSITORY_TYPES.hdfs:
        return `${this.esPluginDocBasePath}${REPOSITORY_DOC_PATHS.hdfs}`;
      case REPOSITORY_TYPES.azure:
        return `${this.esPluginDocBasePath}${REPOSITORY_DOC_PATHS.azure}`;
      case REPOSITORY_TYPES.gcs:
        return `${this.esPluginDocBasePath}${REPOSITORY_DOC_PATHS.gcs}`;
      default:
        return `${this.esDocBasePath}${REPOSITORY_DOC_PATHS.default}`;
    }
  }

  public getSnapshotDocUrl() {
    return `${this.esDocBasePath}/modules-snapshots.html#_snapshot`;
  }
}

export const documentationLinksService = new DocumentationLinksService();

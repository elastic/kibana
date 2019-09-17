/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { TRANSFORM_DOC_PATHS } from '../../constants';

class DocumentationLinksService {
  private esDocBasePath: string = '';
  private esPluginDocBasePath: string = '';
  private esStackOverviewDocBasePath: string = '';

  public init(
    esDocBasePath: string,
    esPluginDocBasePath: string,
    esStackOverviewDocBasePath: string
  ): void {
    this.esDocBasePath = esDocBasePath;
    this.esPluginDocBasePath = esPluginDocBasePath;
    this.esStackOverviewDocBasePath = esStackOverviewDocBasePath;
  }

  public getTransformPluginDocUrl() {
    return `${this.esPluginDocBasePath}${TRANSFORM_DOC_PATHS.plugins}`;
  }

  public getSnapshotDocUrl() {
    return `${this.esDocBasePath}/modules-snapshots.html#snapshots-take-snapshot`;
  }

  public getCronUrl() {
    return `${this.esStackOverviewDocBasePath}/trigger-schedule.html#schedule-cron`;
  }
}

export const documentationLinksService = new DocumentationLinksService();

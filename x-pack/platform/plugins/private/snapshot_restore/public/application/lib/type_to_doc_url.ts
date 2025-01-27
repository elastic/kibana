/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DocLinksStart } from '@kbn/core/public';
import { RepositoryType } from '../../../common/types';
import { REPOSITORY_TYPES } from '../../../common';

export const getRepositoryTypeDocUrl = (docLinks: DocLinksStart, type: RepositoryType) => {
  switch (type) {
    case REPOSITORY_TYPES.fs:
      return docLinks.links.snapshotRestore.registerSharedFileSystem;
    case REPOSITORY_TYPES.url:
      return `${docLinks.links.snapshotRestore.registerUrl}`;
    case REPOSITORY_TYPES.source:
      return `${docLinks.links.snapshotRestore.registerSourceOnly}`;
    case REPOSITORY_TYPES.s3:
      return `${docLinks.links.plugins.s3Repo}`;
    case REPOSITORY_TYPES.hdfs:
      return `${docLinks.links.plugins.hdfsRepo}`;
    case REPOSITORY_TYPES.azure:
      return `${docLinks.links.plugins.azureRepo}`;
    case REPOSITORY_TYPES.gcs:
      return `${docLinks.links.plugins.gcsRepo}`;
    default:
      return `${docLinks.links.snapshotRestore.guide}`;
  }
};

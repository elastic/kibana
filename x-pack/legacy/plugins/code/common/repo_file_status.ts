/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum RepoFileStatus {
  LANG_SERVER_IS_INITIALIZING = 'Language server is initializing',
  INDEXING = 'Indexing in progress',
  FILE_NOT_SUPPORTED = 'Current file is not of a supported language',
  GENERIC_LANG = 'Current file is only covered by generic language server',
  REVISION_NOT_INDEXED = 'Current revision is not indexed',
  LANG_SERVER_NOT_INSTALLED = 'Install additional language server to support current file',
  FILE_IS_TOO_BIG = 'Current file is too big',
}

export enum Severity {
  NOTICE,
  WARNING,
  ERROR,
}

export const REPO_FILE_STATUS_SEVERITY = {
  [RepoFileStatus.LANG_SERVER_IS_INITIALIZING]: {
    severity: Severity.NOTICE,
  },
  [RepoFileStatus.INDEXING]: {
    severity: Severity.NOTICE,
  },
  [RepoFileStatus.FILE_NOT_SUPPORTED]: {
    severity: Severity.NOTICE,
  },
  [RepoFileStatus.GENERIC_LANG]: {
    severity: Severity.NOTICE,
  },
  [RepoFileStatus.REVISION_NOT_INDEXED]: {
    severity: Severity.WARNING,
  },
  [RepoFileStatus.LANG_SERVER_NOT_INSTALLED]: {
    severity: Severity.WARNING,
  },
  [RepoFileStatus.FILE_IS_TOO_BIG]: {
    severity: Severity.NOTICE,
  },
};

export interface StatusReport {
  repoStatus?: RepoFileStatus.INDEXING | RepoFileStatus.REVISION_NOT_INDEXED;
  fileStatus?: RepoFileStatus.FILE_NOT_SUPPORTED | RepoFileStatus.FILE_IS_TOO_BIG;
  langServerStatus?:
    | RepoFileStatus.GENERIC_LANG
    | RepoFileStatus.LANG_SERVER_IS_INITIALIZING
    | RepoFileStatus.LANG_SERVER_NOT_INSTALLED;
}

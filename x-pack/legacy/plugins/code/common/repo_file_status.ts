/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export enum RepoFileStatus {
  LANG_SERVER_IS_INITIALIZING = 'Language server is initializing.',
  LANG_SERVER_INITIALIZED = 'Language server initialized.',
  INDEXING = 'Indexing in progress',
  FILE_NOT_SUPPORTED = 'Current file is not of a supported language.',
  REVISION_NOT_INDEXED = 'Current revision is not indexed.',
  LANG_SERVER_NOT_INSTALLED = 'Install additional language server to support current file.',
  FILE_IS_TOO_BIG = 'Current file is too big.',
  LANG_SERVER_LAUNCH_FAILED = 'Language server failed to launch',
}

export enum Severity {
  NONE,
  NOTICE,
  WARNING,
  ERROR,
}

export enum LangServerType {
  NONE = 'Current file is not supported by any language server',
  GENERIC = 'Current file is only covered by generic language server',
  DEDICATED = 'Current file is covered by dedicated language server',
}

export const RepoFileStatusText = {
  [RepoFileStatus.LANG_SERVER_IS_INITIALIZING]: i18n.translate(
    'xpack.code.repoFileStatus.langugageServerIsInitializitingMessage',
    {
      defaultMessage: 'Language server is initializing.',
    }
  ),
  [RepoFileStatus.LANG_SERVER_INITIALIZED]: i18n.translate(
    'xpack.code.repoFileStatus.languageServerInitializedMessage',
    {
      defaultMessage: 'Language server initialized.',
    }
  ),
  [RepoFileStatus.INDEXING]: i18n.translate('xpack.code.repoFileStatus.IndexingInProgressMessage', {
    defaultMessage: 'Indexing in progress.',
  }),
  [RepoFileStatus.FILE_NOT_SUPPORTED]: i18n.translate(
    'xpack.code.repoFileStatus.fileNotSupportedMessage',
    {
      defaultMessage: 'Current file is not of a supported language.',
    }
  ),
  [RepoFileStatus.REVISION_NOT_INDEXED]: i18n.translate(
    'xpack.code.repoFileStatus.revisionNotIndexedMessage',
    {
      defaultMessage: 'Current revision is not indexed.',
    }
  ),
  [RepoFileStatus.LANG_SERVER_NOT_INSTALLED]: i18n.translate(
    'xpack.code.repoFileStatus.langServerNotInstalledMessage',
    {
      defaultMessage: 'Install additional language server to support current file.',
    }
  ),
  [RepoFileStatus.FILE_IS_TOO_BIG]: i18n.translate(
    'xpack.code.repoFileStatus.fileIsTooBigMessage',
    {
      defaultMessage: 'Current file is too big.',
    }
  ),
  [LangServerType.NONE]: i18n.translate('xpack.code.repoFileStatus.langserverType.noneMessage', {
    defaultMessage: 'Current file is not supported by any language server.',
  }),
  [LangServerType.GENERIC]: i18n.translate(
    'xpack.code.repoFileStatus.langserverType.genericMessage',
    {
      defaultMessage: 'Current file is only covered by generic language server.',
    }
  ),
  [LangServerType.DEDICATED]: i18n.translate(
    'xpack.code.repoFileStatus.langserverType.dedicatedMessage',
    {
      defaultMessage: 'Current file is covered by dedicated language server.',
    }
  ),
  [RepoFileStatus.LANG_SERVER_LAUNCH_FAILED]: i18n.translate(
    'xpack.code.repoFileStatus.langServerLaunchFailed',
    {
      defaultMessage: 'Language server launch failed.',
    }
  ),
};

export enum CTA {
  SWITCH_TO_HEAD,
  GOTO_LANG_MANAGE_PAGE,
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
  [LangServerType.GENERIC]: {
    severity: Severity.NOTICE,
  },
  [RepoFileStatus.REVISION_NOT_INDEXED]: {
    severity: Severity.WARNING,
    fix: CTA.SWITCH_TO_HEAD,
  },
  [RepoFileStatus.LANG_SERVER_NOT_INSTALLED]: {
    severity: Severity.WARNING,
    fix: CTA.GOTO_LANG_MANAGE_PAGE,
  },
  [RepoFileStatus.FILE_IS_TOO_BIG]: {
    severity: Severity.NOTICE,
  },
};

export interface StatusReport {
  repoStatus?: RepoFileStatus.INDEXING | RepoFileStatus.REVISION_NOT_INDEXED;
  fileStatus?: RepoFileStatus.FILE_NOT_SUPPORTED | RepoFileStatus.FILE_IS_TOO_BIG;
  langServerType?: LangServerType;
  langServerStatus?:
    | RepoFileStatus.LANG_SERVER_IS_INITIALIZING
    | RepoFileStatus.LANG_SERVER_NOT_INSTALLED
    | RepoFileStatus.LANG_SERVER_LAUNCH_FAILED
    | RepoFileStatus.LANG_SERVER_INITIALIZED;
}

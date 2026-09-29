/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilesSetup } from '@kbn/files-plugin/public';
import type { FileKindBrowser } from '@kbn/shared-ux-file-types';
import {
  GENERAL_CASES_OWNER,
  MAX_FILE_SIZE,
  MAX_IMAGE_FILE_SIZE,
  OBSERVABILITY_OWNER,
  OWNERS,
  SECURITY_SOLUTION_OWNER,
} from '../../common/constants';
import { IMAGE_MIME_TYPES } from '../../common/constants/mime_types';
import type { Owner } from '../../common/constants/types';
import { constructFileKindIdByOwner } from '../../common/files';
import type { CaseFileKinds, FilesConfig } from './types';
import * as i18n from './translations';

/**
 * Mirrors the server-side per-file limit (see `createMaxCallback`) so oversized
 * images are rejected client-side before uploading instead of failing mid-stream.
 */
const createMaxSizeBytes =
  (config: FilesConfig) =>
  (file: File): number => {
    if (config.maxSize != null) {
      return config.maxSize;
    }

    const allowedMimeTypesSet = new Set(config.allowedMimeTypes);

    if (file.type && allowedMimeTypesSet.has(file.type) && IMAGE_MIME_TYPES.has(file.type)) {
      return MAX_IMAGE_FILE_SIZE;
    }

    return MAX_FILE_SIZE;
  };

const getOwnerUIName = (owner: Owner) => {
  switch (owner) {
    case SECURITY_SOLUTION_OWNER:
      return 'Security';
    case OBSERVABILITY_OWNER:
      return 'Observability';
    case GENERAL_CASES_OWNER:
      return 'Stack Management';
    default:
      return owner;
  }
};

const buildFileKind = (config: FilesConfig, owner: Owner): FileKindBrowser => {
  return {
    id: constructFileKindIdByOwner(owner),
    allowedMimeTypes: config.allowedMimeTypes,
    maxSizeBytes: createMaxSizeBytes(config),
    // The allow-list is long; the upload modal shows the supported categories
    // itself, so omit the raw MIME list from the shared-ux error.
    listAllowedMimeTypesInError: false,
    managementUiActions: {
      delete: {
        enabled: false,
        reason: i18n.FILE_DELETE_REASON(getOwnerUIName(owner)),
      },
    },
  };
};

export const isRegisteredOwner = (ownerToCheck: string): ownerToCheck is Owner =>
  OWNERS.includes(ownerToCheck as Owner);

/**
 * The file kind definition for interacting with the file service for the UI
 */
const createFileKinds = (config: FilesConfig): CaseFileKinds => {
  const caseFileKinds = new Map<Owner, FileKindBrowser>();

  for (const owner of OWNERS) {
    caseFileKinds.set(owner, buildFileKind(config, owner));
  }

  return caseFileKinds;
};

export const registerCaseFileKinds = (config: FilesConfig, filesSetupPlugin: FilesSetup) => {
  const fileKinds = createFileKinds(config);

  for (const fileKind of fileKinds.values()) {
    filesSetupPlugin.registerFileKind(fileKind);
  }
};

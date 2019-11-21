/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { textService } from '../text';
import {
  Repository,
  RepositoryType,
  FSRepository,
  ReadonlyRepository,
  S3Repository,
  GCSRepository,
  HDFSRepository,
  EmptyRepository,
} from '../../../../common/types';
import { REPOSITORY_TYPES } from '../../../../common/constants';

export interface RepositoryValidation {
  isValid: boolean;
  errors: {
    name?: string[];
    type?: string[];
    settings?: RepositorySettingsValidation;
  };
}

export interface RepositorySettingsValidation {
  [key: string]: string[];
}

export const INVALID_NAME_CHARS = ['"', '*', '\\', '<', '|', ',', '>', '/', '?'];

const isStringEmpty = (str: string | null): boolean => {
  return str ? !Boolean(str.trim()) : true;
};

const doesStringContainChar = (string: string, char: string | string[]) => {
  const chars = Array.isArray(char) ? char : [char];
  const total = chars.length;
  let containsChar = false;
  let charFound: string | null = null;

  for (let i = 0; i < total; i++) {
    if (string.includes(chars[i])) {
      containsChar = true;
      charFound = chars[i];
      break;
    }
  }

  return { containsChar, charFound };
};

export const validateRepository = (
  repository: Repository | EmptyRepository,
  validateSettings: boolean = true
): RepositoryValidation => {
  const { name, type, settings } = repository;
  const { i18n } = textService;
  const validation: RepositoryValidation = {
    isValid: true,
    errors: {},
  };

  if (validateSettings) {
    const settingsValidation = validateRepositorySettings(type, settings);

    if (Object.keys(settingsValidation).length) {
      validation.errors.settings = settingsValidation;
    }
  }

  if (isStringEmpty(name)) {
    validation.errors.name = [
      i18n.translate('xpack.snapshotRestore.repositoryValidation.nameRequired', {
        defaultMessage: 'Repository name is required.',
      }),
    ];
  }

  if (name.includes(' ')) {
    validation.errors.name = [
      i18n.translate('xpack.snapshotRestore.repositoryValidation.nameValidation.errorSpace', {
        defaultMessage: 'Spaces are not allowed in the name.',
      }),
    ];
  }

  const nameCharValidation = doesStringContainChar(name, INVALID_NAME_CHARS);

  if (nameCharValidation.containsChar) {
    validation.errors.name = [
      i18n.translate('xpack.snapshotRestore.repositoryValidation.nameValidation.invalidCharacter', {
        defaultMessage: 'Character "{char}" is not allowed in the name.',
        values: { char: nameCharValidation.charFound },
      }),
    ];
  }

  if (
    isStringEmpty(type) ||
    (type === REPOSITORY_TYPES.source && isStringEmpty(settings.delegateType))
  ) {
    validation.errors.type = [
      i18n.translate('xpack.snapshotRestore.repositoryValidation.delegateTypeRequired', {
        defaultMessage: 'Type is required.',
      }),
    ];
  }

  if (Object.keys(validation.errors).length) {
    validation.isValid = false;
  }

  return validation;
};

const validateRepositorySettings = (
  type: RepositoryType | null,
  settings: Repository['settings']
): RepositorySettingsValidation => {
  switch (type) {
    case REPOSITORY_TYPES.fs:
      return validateFSRepositorySettings(settings);
    case REPOSITORY_TYPES.url:
      return validateReadonlyRepositorySettings(settings);
    case REPOSITORY_TYPES.source:
      return validateRepositorySettings(settings.delegateType, settings);
    case REPOSITORY_TYPES.s3:
      return validateS3RepositorySettings(settings);
    case REPOSITORY_TYPES.gcs:
      return validateGCSRepositorySettings(settings);
    case REPOSITORY_TYPES.hdfs:
      return validateHDFSRepositorySettings(settings);
    // No validation on settings needed for azure (all settings are optional)
    default:
      return {};
  }
};

const validateFSRepositorySettings = (
  settings: FSRepository['settings']
): RepositorySettingsValidation => {
  const i18n = textService.i18n;
  const validation: RepositorySettingsValidation = {};
  const { location } = settings;
  if (isStringEmpty(location)) {
    validation.location = [
      i18n.translate('xpack.snapshotRestore.repositoryValidation.locationRequired', {
        defaultMessage: 'Location is required.',
      }),
    ];
  }
  return validation;
};

const validateReadonlyRepositorySettings = (
  settings: ReadonlyRepository['settings']
): RepositorySettingsValidation => {
  const i18n = textService.i18n;
  const validation: RepositorySettingsValidation = {};
  const { url } = settings;
  if (isStringEmpty(url)) {
    validation.url = [
      i18n.translate('xpack.snapshotRestore.repositoryValidation.urlRequired', {
        defaultMessage: 'URL is required.',
      }),
    ];
  }
  return validation;
};

const validateS3RepositorySettings = (
  settings: S3Repository['settings']
): RepositorySettingsValidation => {
  const i18n = textService.i18n;
  const validation: RepositorySettingsValidation = {};
  const { bucket } = settings;
  if (isStringEmpty(bucket)) {
    validation.bucket = [
      i18n.translate('xpack.snapshotRestore.repositoryValidation.bucketRequired', {
        defaultMessage: 'Bucket is required.',
      }),
    ];
  }
  return validation;
};

const validateGCSRepositorySettings = (
  settings: GCSRepository['settings']
): RepositorySettingsValidation => {
  const i18n = textService.i18n;
  const validation: RepositorySettingsValidation = {};
  const { bucket } = settings;
  if (isStringEmpty(bucket)) {
    validation.bucket = [
      i18n.translate('xpack.snapshotRestore.repositoryValidation.bucketRequired', {
        defaultMessage: 'Bucket is required.',
      }),
    ];
  }
  return validation;
};

const validateHDFSRepositorySettings = (
  settings: HDFSRepository['settings']
): RepositorySettingsValidation => {
  const i18n = textService.i18n;
  const validation: RepositorySettingsValidation = {};
  const { uri, path } = settings;
  if (isStringEmpty(uri)) {
    validation.uri = [
      i18n.translate('xpack.snapshotRestore.repositoryValidation.uriRequired', {
        defaultMessage: 'URI is required.',
      }),
    ];
  }
  if (isStringEmpty(path)) {
    validation.path = [
      i18n.translate('xpack.snapshotRestore.repositoryValidation.pathRequired', {
        defaultMessage: 'Path is required.',
      }),
    ];
  }
  return validation;
};

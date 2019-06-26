/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RestoreSettings } from '../../../../common/types';
import { UNMODIFIABLE_INDEX_SETTINGS, UNREMOVABLE_INDEX_SETTINGS } from '../../../app/constants';
import { textService } from '../text';

export interface RestoreValidation {
  isValid: boolean;
  errors: { [key: string]: React.ReactNode[] };
}

const isStringEmpty = (str: string | null): boolean => {
  return str ? !Boolean(str.trim()) : true;
};

export const validateRestore = (restoreSettings: RestoreSettings): RestoreValidation => {
  const i18n = textService.i18n;
  const {
    indices,
    renamePattern,
    renameReplacement,
    indexSettings,
    ignoreIndexSettings,
  } = restoreSettings;

  const validation: RestoreValidation = {
    isValid: true,
    errors: {
      indices: [],
      renamePattern: [],
      renameReplacement: [],
      indexSettings: [],
      ignoreIndexSettings: [],
    },
  };

  if (Array.isArray(indices) && indices.length === 0) {
    validation.errors.indices.push(
      i18n.translate('xpack.snapshotRestore.restoreValidation.indicesRequiredError', {
        defaultMessage: 'At least one index is required.',
      })
    );
  }

  if (renamePattern !== undefined && isStringEmpty(renamePattern)) {
    validation.errors.renamePattern.push(
      i18n.translate('xpack.snapshotRestore.restoreValidation.renamePatternRequiredError', {
        defaultMessage: 'A capture pattern is required.',
      })
    );
  }

  if (renameReplacement !== undefined && isStringEmpty(renameReplacement)) {
    validation.errors.renameReplacement.push(
      i18n.translate('xpack.snapshotRestore.restoreValidation.renameReplacementRequiredError', {
        defaultMessage: 'A replacement pattern is required.',
      })
    );
  }

  if (typeof indexSettings === 'string') {
    try {
      const parsedIndexSettings = JSON.parse(indexSettings);
      const modifiedSettings = Object.keys(parsedIndexSettings);
      const modifiedSettingsCount = modifiedSettings.length;
      const unmodifiableSettings =
        modifiedSettingsCount > 0
          ? modifiedSettings.filter(setting => UNMODIFIABLE_INDEX_SETTINGS.includes(setting))
          : null;

      if (modifiedSettingsCount === 0) {
        validation.errors.indexSettings.push(
          i18n.translate('xpack.snapshotRestore.restoreValidation.indexSettingsRequiredError', {
            defaultMessage: 'At least one setting is required.',
          })
        );
      }

      if (unmodifiableSettings && unmodifiableSettings.length > 0) {
        validation.errors.indexSettings.push(
          i18n.translate(
            'xpack.snapshotRestore.restoreValidation.indexSettingsNotModifiableError',
            {
              defaultMessage: 'These settings are not modifiable: {settings}',
              // @ts-ignore Bug filed: https://github.com/elastic/kibana/issues/39299
              values: {
                settings: unmodifiableSettings,
              },
            }
          )
        );
      }
    } catch (e) {
      validation.errors.indexSettings.push(
        i18n.translate('xpack.snapshotRestore.restoreValidation.indexSettingsInvalidError', {
          defaultMessage: 'Invalid JSON format',
        })
      );
    }
  }

  if (Array.isArray(ignoreIndexSettings)) {
    const ignoredSettingsCount = ignoreIndexSettings.length;
    const unremovableSettings =
      ignoredSettingsCount > 0
        ? ignoreIndexSettings.filter(setting => UNREMOVABLE_INDEX_SETTINGS.includes(setting))
        : null;

    if (ignoredSettingsCount === 0) {
      validation.errors.ignoreIndexSettings.push(
        i18n.translate('xpack.snapshotRestore.restoreValidation.ignoreIndexSettingsRequiredError', {
          defaultMessage: 'At least one setting is required.',
        })
      );
    }

    if (unremovableSettings && unremovableSettings.length > 0) {
      validation.errors.ignoreIndexSettings.push(
        i18n.translate('xpack.snapshotRestore.restoreValidation.indexSettingsNotRemovableError', {
          defaultMessage: 'These settings are not removable: {settings}',
          // @ts-ignore Bug filed: https://github.com/elastic/kibana/issues/39299
          values: {
            settings: unremovableSettings,
          },
        })
      );
    }
  }

  // Remove fields with no errors
  validation.errors = Object.entries(validation.errors)
    .filter(([key, value]) => value.length > 0)
    .reduce((errs: RestoreValidation['errors'], [key, value]) => {
      errs[key] = value;
      return errs;
    }, {});

  // Set overall validations status
  if (Object.keys(validation.errors).length > 0) {
    validation.isValid = false;
  }

  return validation;
};

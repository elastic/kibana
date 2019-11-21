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

  if (typeof indices === 'string' && indices.trim().length === 0) {
    validation.errors.indices.push(
      i18n.translate('xpack.snapshotRestore.restoreValidation.indexPatternRequiredError', {
        defaultMessage: 'At least one index pattern is required.',
      })
    );
  }

  if (Array.isArray(indices) && indices.length === 0) {
    validation.errors.indices.push(
      i18n.translate('xpack.snapshotRestore.restoreValidation.indicesRequiredError', {
        defaultMessage: 'You must select at least one index.',
      })
    );
  }

  if (renamePattern !== undefined && isStringEmpty(renamePattern)) {
    validation.errors.renamePattern.push(
      i18n.translate('xpack.snapshotRestore.restoreValidation.renamePatternRequiredError', {
        defaultMessage: 'Capture pattern is required.',
      })
    );
  }

  if (renameReplacement !== undefined && isStringEmpty(renameReplacement)) {
    validation.errors.renameReplacement.push(
      i18n.translate('xpack.snapshotRestore.restoreValidation.renameReplacementRequiredError', {
        defaultMessage: 'Replacement pattern is required.',
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
              defaultMessage: 'You can’t modify: {settings}',
              // @ts-ignore Bug filed: https://github.com/elastic/kibana/issues/39299
              values: {
                settings: unmodifiableSettings.map((setting: string, index: number) =>
                  index === 0 ? `${setting} ` : setting
                ),
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
          defaultMessage: 'You can’t reset: {settings}',
          // @ts-ignore Bug filed: https://github.com/elastic/kibana/issues/39299
          values: {
            settings: unremovableSettings.map((setting: string, index: number) =>
              index === 0 ? `${setting} ` : setting
            ),
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

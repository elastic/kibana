/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { Template } from '../../common/types';

const ILLEGAL_CHARACTERS = ['\\', '/', '?', '"', '<', '>', '|'];

const isStringEmpty = (str: string | null): boolean => {
  return str ? !Boolean(str.trim()) : true;
};

const getFieldsWithIllegalCharacters = (fieldsToValidate: string[] = []) => {
  return fieldsToValidate.reduce((fields: any, field) => {
    const illegalChars = ILLEGAL_CHARACTERS.reduce((chars: any, char: string) => {
      if (field.includes(char)) {
        chars.push(char);
      }

      return chars;
    }, []);

    if (illegalChars.length) {
      fields.push(field);
    }

    return fields;
  }, []);
};

export interface TemplateValidation {
  isValid: boolean;
  errors: { [key: string]: React.ReactNode[] };
}

export const validateTemplate = (template: Template): TemplateValidation => {
  const { name, indexPatterns, settings, aliases } = template;

  const validation: TemplateValidation = {
    isValid: true,
    errors: {
      indexPatterns: [],
      name: [],
      settings: [],
      aliases: [],
      mappings: [],
    },
  };

  const invalidJsonMsg = i18n.translate('xpack.idxMgmt.templateValidation.settingsInvalidError', {
    defaultMessage: 'Invalid JSON format.',
  });

  // Name validation
  if (name !== undefined && isStringEmpty(name)) {
    validation.errors.name.push(
      i18n.translate('xpack.idxMgmt.templateValidation.nameRequiredError', {
        defaultMessage: 'Name is required.',
      })
    );
  }

  // Index patterns validation
  const invalidIndexPatterns = getFieldsWithIllegalCharacters(indexPatterns);

  if (Array.isArray(indexPatterns) && indexPatterns.length === 0) {
    validation.errors.indexPatterns.push(
      i18n.translate('xpack.idxMgmt.templateValidation.indexPatternsRequiredError', {
        defaultMessage: 'You must define at least one index pattern.',
      })
    );
  } else if (invalidIndexPatterns.length) {
    validation.errors.indexPatterns.push(
      i18n.translate('xpack.idxMgmt.templateValidation.indexPatternsIllegalCharactersError', {
        defaultMessage:
          '{invalidIndexPatterns} index {numInvalidIndexPatterns, plural, one {pattern contains} other {patterns contain}} illegal characters.',
        values: {
          invalidIndexPatterns: indexPatterns.map(pattern => `'${pattern}'`).join(', '),
          numInvalidIndexPatterns: invalidIndexPatterns.length,
        },
      })
    );
  }

  // Settings validation
  if (typeof settings === 'string' && !isStringEmpty(settings)) {
    try {
      const parsedSettingsJson = JSON.parse(settings);
      if (parsedSettingsJson && typeof parsedSettingsJson !== 'object') {
        validation.errors.settings.push(invalidJsonMsg);
      }
    } catch (e) {
      validation.errors.settings.push(invalidJsonMsg);
    }
  }

  // Aliases validation
  if (typeof aliases === 'string' && !isStringEmpty(aliases)) {
    try {
      const parsedAliasesJson = JSON.parse(aliases);
      if (parsedAliasesJson && typeof parsedAliasesJson !== 'object') {
        validation.errors.aliases.push(invalidJsonMsg);
      }
    } catch (e) {
      validation.errors.aliases.push(invalidJsonMsg);
    }
  }

  // Remove fields with no errors
  validation.errors = Object.entries(validation.errors)
    .filter(([_key, value]) => value.length > 0)
    .reduce((errs: TemplateValidation['errors'], [key, value]) => {
      errs[key] = value;
      return errs;
    }, {});

  // Set overall validations status
  if (Object.keys(validation.errors).length > 0) {
    validation.isValid = false;
  }

  return validation;
};

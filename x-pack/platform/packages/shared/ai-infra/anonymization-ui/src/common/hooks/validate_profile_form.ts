/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { NER_ENTITY_CLASSES, NER_MODEL_ID } from '@kbn/anonymization-common';
import { TARGET_TYPE_DATA_VIEW, TARGET_TYPE_INDEX } from '../target_types';
import type { ProfileFormValidationErrors, ProfileFormValues } from './profile_form_types';

const NER_ENTITY_CLASS_SET = new Set<string>(NER_ENTITY_CLASSES);

export const validateProfileForm = (values: ProfileFormValues): ProfileFormValidationErrors => {
  const errors: ProfileFormValidationErrors = {};

  if (!values.name.trim()) {
    errors.name = i18n.translate('anonymizationUi.profiles.validation.nameRequired', {
      defaultMessage: 'Profile name is required',
    });
  }

  if (!values.targetType) {
    errors.targetType = i18n.translate('anonymizationUi.profiles.validation.targetTypeRequired', {
      defaultMessage: 'Target type is required',
    });
  }

  if (!values.targetId.trim()) {
    errors.targetId = i18n.translate('anonymizationUi.profiles.validation.targetIdRequired', {
      defaultMessage: 'Target identifier is required',
    });
  } else if (values.targetType === TARGET_TYPE_DATA_VIEW && values.targetId.includes('*')) {
    errors.targetId = i18n.translate(
      'anonymizationUi.profiles.validation.dataViewTargetIdMustBeSavedObjectId',
      {
        defaultMessage: 'Data view target id must be a saved object id, not a wildcard pattern',
      }
    );
  } else if (values.targetType === TARGET_TYPE_INDEX && values.targetId.includes('*')) {
    errors.targetId = i18n.translate(
      'anonymizationUi.profiles.validation.indexTargetIdMustBeConcreteName',
      {
        defaultMessage: 'Index target id must be a concrete index name',
      }
    );
  }

  const hasInvalidEntityClass = values.fieldRules.some(
    (rule) => rule.anonymized && !(rule.entityClass ?? '').trim()
  );
  if (hasInvalidEntityClass) {
    errors.fieldRules = i18n.translate(
      'anonymizationUi.profiles.validation.entityClassRequiredForAnonymizedFields',
      {
        defaultMessage: 'Entity class is required for anonymized fields',
      }
    );
  }

  const hasInvalidRegexRule = values.regexRules.some(
    (rule) => !rule.pattern.trim() || !rule.entityClass.trim()
  );
  if (hasInvalidRegexRule) {
    errors.regexRules = i18n.translate(
      'anonymizationUi.profiles.validation.regexRuleFieldsRequired',
      {
        defaultMessage: 'Regex pattern and entity class are required for regex rules',
      }
    );
  }

  const hasInvalidNerRule = values.nerRules.some((rule) => {
    const modelId = rule.modelId ?? NER_MODEL_ID;
    if (!modelId.trim()) {
      return true;
    }

    if (rule.allowedEntityClasses.length === 0) {
      return true;
    }

    return rule.allowedEntityClasses.some((entity) => !NER_ENTITY_CLASS_SET.has(entity.trim()));
  });
  if (hasInvalidNerRule) {
    errors.nerRules = i18n.translate('anonymizationUi.profiles.validation.nerRuleFieldsRequired', {
      defaultMessage:
        'NER model id is required and allowed entities must be selected from PER, ORG, LOC, MISC.',
    });
  }

  return errors;
};

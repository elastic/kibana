/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SEVERITY_LEVELS } from '@kbn/alerting-v2-schemas';

export type ImportSeverity = (typeof SEVERITY_LEVELS)[number];

export interface ImportFormState {
  name: string;
  description: string;
  defaultSeverity: ImportSeverity;
  fingerprintField: string;
}

export const DEFAULT_IMPORT_FORM_STATE: ImportFormState = {
  name: '',
  description: '',
  defaultSeverity: 'medium',
  fingerprintField: '',
};

const MAX_NAME_LENGTH = 256;

/** Dotted path of letters, digits, underscores and dashes, for example `labels.env`. */
const FINGERPRINT_FIELD_PATTERN = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/;

const SEVERITY_LABELS: Record<ImportSeverity, string> = {
  info: i18n.translate('xpack.alertingV2.imports.severity.info', { defaultMessage: 'Info' }),
  low: i18n.translate('xpack.alertingV2.imports.severity.low', { defaultMessage: 'Low' }),
  medium: i18n.translate('xpack.alertingV2.imports.severity.medium', { defaultMessage: 'Medium' }),
  high: i18n.translate('xpack.alertingV2.imports.severity.high', { defaultMessage: 'High' }),
  critical: i18n.translate('xpack.alertingV2.imports.severity.critical', {
    defaultMessage: 'Critical',
  }),
};

export const SEVERITY_OPTIONS = SEVERITY_LEVELS.map((level) => ({
  value: level,
  text: SEVERITY_LABELS[level],
}));

export const validateName = (value: string): string | true => {
  const trimmed = value.trim();
  if (trimmed === '') {
    return i18n.translate('xpack.alertingV2.imports.form.name.required', {
      defaultMessage: 'A name is required.',
    });
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return i18n.translate('xpack.alertingV2.imports.form.name.tooLong', {
      defaultMessage: 'The name must be at most {max} characters.',
      values: { max: MAX_NAME_LENGTH },
    });
  }
  return true;
};

export const validateFingerprintField = (value: string): string | true => {
  const trimmed = value.trim();
  if (trimmed === '' || FINGERPRINT_FIELD_PATTERN.test(trimmed)) {
    return true;
  }
  return i18n.translate('xpack.alertingV2.imports.form.fingerprintField.invalid', {
    defaultMessage:
      'Use a field path such as monitor_id or labels.env. Letters, digits, underscores and dashes only.',
  });
};

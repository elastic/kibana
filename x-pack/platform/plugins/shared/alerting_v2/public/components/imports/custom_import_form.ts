/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AlertEventSeverity, CreateImportData } from '@kbn/alerting-v2-schemas';

export interface CustomImportFormState {
  name: string;
  description: string;
  source: string;
  defaultSeverity: AlertEventSeverity;
  fingerprintField: string;
  tags: string[];
  routingTags: string[];
  owner: string;
}

export const DEFAULT_CUSTOM_IMPORT_FORM_STATE: CustomImportFormState = {
  name: '',
  description: '',
  source: '',
  defaultSeverity: 'medium',
  fingerprintField: '',
  tags: [],
  routingTags: [],
  owner: '',
};

const RESERVED_SOURCE_PREFIX = 'elastic';
const MAX_SOURCE_LENGTH = 100;
const MAX_NAME_LENGTH = 256;

/** Dotted path of letters, digits, underscores and dashes, for example `labels.env`. */
export const FINGERPRINT_FIELD_PATTERN = /^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/;

/** Mirrors the server default: a slug of the name that never starts with the reserved prefix. */
export const toImportSource = (name: string): string => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SOURCE_LENGTH);
  if (slug === '') {
    return '';
  }
  return slug.startsWith(RESERVED_SOURCE_PREFIX) ? `custom-${slug}` : slug;
};

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

export const validateSource = (value: string): string | true => {
  const trimmed = value.trim();
  if (trimmed === '') {
    return true;
  }
  if (trimmed.startsWith(RESERVED_SOURCE_PREFIX)) {
    return i18n.translate('xpack.alertingV2.imports.form.source.reserved', {
      defaultMessage: 'The source cannot start with "elastic". That prefix is reserved.',
    });
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return i18n.translate('xpack.alertingV2.imports.form.source.tooLong', {
      defaultMessage: 'The source must be at most {max} characters.',
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

/** Drops empty optional values so the request only carries what the user filled in. */
export const toCreateImportData = (values: CustomImportFormState): CreateImportData => {
  const description = values.description.trim();
  const source = values.source.trim();
  const fingerprintField = values.fingerprintField.trim();
  const owner = values.owner.trim();
  return {
    name: values.name.trim(),
    ...(description !== '' ? { description } : {}),
    ...(source !== '' ? { source } : {}),
    default_severity: values.defaultSeverity,
    ...(fingerprintField !== '' ? { fingerprint_field: fingerprintField } : {}),
    ...(values.tags.length > 0 ? { tags: values.tags } : {}),
    ...(values.routingTags.length > 0 ? { routing_tags: values.routingTags } : {}),
    ...(owner !== '' ? { owner } : {}),
  };
};

const importErrorBodySchema = lazySchema(() =>
  z.object({
    message: z.string().optional(),
    details: z
      .object({ step: z.string().optional(), rolled_back: z.boolean().optional() })
      .optional(),
  })
);

const httpErrorSchema = lazySchema(() =>
  z.object({ message: z.string().optional(), body: importErrorBodySchema })
);

const FALLBACK_ERROR_MESSAGE = () =>
  i18n.translate('xpack.alertingV2.imports.form.unknownError', {
    defaultMessage: 'Something went wrong while setting up the import.',
  });

export interface ImportRequestError {
  message: string;
  /** Which setup step failed, when the server says. */
  step?: string;
  rolledBack?: boolean;
}

/** Reads the server's `{ message, details: { step, rolled_back } }` error body, if there is one. */
export const parseImportRequestError = (error: unknown): ImportRequestError => {
  const parsed = httpErrorSchema.safeParse(error);
  if (parsed.success) {
    const { body } = parsed.data;
    return {
      message: body.message ?? parsed.data.message ?? FALLBACK_ERROR_MESSAGE(),
      step: body.details?.step,
      rolledBack: body.details?.rolled_back,
    };
  }
  return {
    message: error instanceof Error ? error.message : FALLBACK_ERROR_MESSAGE(),
  };
};

const SETUP_STEP_LABELS: Record<string, () => string> = {
  create_connector: () =>
    i18n.translate('xpack.alertingV2.imports.setupStep.createConnector', {
      defaultMessage: 'Creating the webhook connector',
    }),
  rotate_token: () =>
    i18n.translate('xpack.alertingV2.imports.setupStep.rotateToken', {
      defaultMessage: 'Generating the token',
    }),
  create_workflow: () =>
    i18n.translate('xpack.alertingV2.imports.setupStep.createWorkflow', {
      defaultMessage: 'Creating the workflow',
    }),
  save_import: () =>
    i18n.translate('xpack.alertingV2.imports.setupStep.saveImport', {
      defaultMessage: 'Saving the import',
    }),
};

export const getSetupStepLabel = (step: string): string => SETUP_STEP_LABELS[step]?.() ?? step;

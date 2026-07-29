/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import {
  MAX_TEMPLATE_DESCRIPTION_LENGTH,
  MAX_TEMPLATE_NAME_LENGTH,
  MAX_TEMPLATE_TAG_LENGTH,
  MAX_TAGS_PER_TEMPLATE,
} from '../../../../common/constants';
import * as i18n from '../translations';

export interface TemplateMetadata {
  name: string;
  description: string;
  tags: string[];
}

export interface TemplateMetadataErrors {
  name?: string;
  description?: string;
  tags?: string;
}

/**
 * Canonicalizes metadata (trim name/description, drop empty/duplicate tags). Normalization is applied
 * at validate/save time only — the Configuration-tab inputs keep the raw keystrokes so typing isn't
 * fought, and a whitespace-only name still surfaces the required error (its trimmed length is 0).
 */
export const normalizeTemplateMetadata = (metadata: TemplateMetadata): TemplateMetadata => {
  const normalizedName = metadata.name.trim();
  const normalizedDescription = metadata.description.trim();
  const normalizedTags = uniq(
    metadata.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)
  );

  return {
    name: normalizedName,
    description: normalizedDescription,
    tags: normalizedTags,
  };
};

export const validateTemplateMetadata = (metadata: TemplateMetadata): TemplateMetadataErrors => {
  const normalized = normalizeTemplateMetadata(metadata);
  const errors: TemplateMetadataErrors = {};

  if (normalized.name.length === 0) {
    errors.name = i18n.TEMPLATE_NAME_REQUIRED;
  } else if (normalized.name.length > MAX_TEMPLATE_NAME_LENGTH) {
    errors.name = i18n.TEMPLATE_NAME_MAX_LENGTH(MAX_TEMPLATE_NAME_LENGTH);
  }

  if (normalized.description.length > MAX_TEMPLATE_DESCRIPTION_LENGTH) {
    errors.description = i18n.TEMPLATE_DESCRIPTION_MAX_LENGTH(MAX_TEMPLATE_DESCRIPTION_LENGTH);
  }

  if (normalized.tags.length > MAX_TAGS_PER_TEMPLATE) {
    errors.tags = i18n.TEMPLATE_TAGS_MAX_COUNT(MAX_TAGS_PER_TEMPLATE);
  } else {
    const tooLongTag = normalized.tags.find((tag) => tag.length > MAX_TEMPLATE_TAG_LENGTH);
    if (tooLongTag) {
      errors.tags = i18n.TEMPLATE_TAG_MAX_LENGTH(MAX_TEMPLATE_TAG_LENGTH);
    }
  }

  return errors;
};

export const hasTemplateMetadataErrors = (errors: TemplateMetadataErrors): boolean =>
  errors.name != null || errors.description != null || errors.tags != null;

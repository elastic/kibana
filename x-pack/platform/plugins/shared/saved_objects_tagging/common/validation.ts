/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Tag } from './types';

export const tagNameMinLength = 2;
export const tagNameMaxLength = 50;
export const tagDescriptionMaxLength = 100;

const hexColorRegexp = /^#[0-9A-F]{6}$/i;

export interface TagValidation {
  valid: boolean;
  warnings: string[];
  errors: Partial<Record<keyof Tag, string | undefined>>;
}

const isHexColor = (color: string): boolean => {
  return hexColorRegexp.test(color);
};

export const validateTagColor = (color: string): string | undefined => {
  if (!isHexColor(color)) {
    return i18n.translate('xpack.savedObjectsTagging.validation.color.errorInvalid', {
      defaultMessage: 'Tag color must be a valid hex color',
    });
  }
};

export const validateTagName = (name: string): string | undefined => {
  if (name.length < tagNameMinLength) {
    return i18n.translate('xpack.savedObjectsTagging.validation.name.errorTooShort', {
      defaultMessage: 'Tag name must be at least {length} characters',
      values: {
        length: tagNameMinLength,
      },
    });
  }
  if (name.length > tagNameMaxLength) {
    return i18n.translate('xpack.savedObjectsTagging.validation.name.errorTooLong', {
      defaultMessage: 'Tag name may not exceed {length} characters',
      values: {
        length: tagNameMaxLength,
      },
    });
  }
};

export const validateTagDescription = (description: string): string | undefined => {
  if (description.length > tagDescriptionMaxLength) {
    return i18n.translate('xpack.savedObjectsTagging.validation.description.errorTooLong', {
      defaultMessage: 'Tag description may not exceed {length} characters',
      values: {
        length: tagDescriptionMaxLength,
      },
    });
  }
};

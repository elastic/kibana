/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  STORED_SOURCE_OPTION,
  DISABLED_SOURCE_OPTION,
  SYNTHETIC_SOURCE_OPTION,
  SourceOptionKey,
} from './constants';

export const sourceOptionLabels: Record<SourceOptionKey, string> = {
  [STORED_SOURCE_OPTION]: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.configuration.storedSourceFieldsLabel',
    {
      defaultMessage: 'Stored _source',
    }
  ),
  [DISABLED_SOURCE_OPTION]: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.configuration.disabledSourceFieldsLabel',
    {
      defaultMessage: 'Disabled _source',
    }
  ),
  [SYNTHETIC_SOURCE_OPTION]: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.configuration.syntheticSourceFieldsLabel',
    {
      defaultMessage: 'Synthetic _source',
    }
  ),
};

export const sourceOptionDescriptions: Record<SourceOptionKey, string> = {
  [STORED_SOURCE_OPTION]: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.configuration.storedSourceFieldsDescription',
    {
      defaultMessage: 'Stores content in _source field for future retrieval',
    }
  ),
  [DISABLED_SOURCE_OPTION]: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.configuration.disabledSourceFieldsDescription',
    {
      defaultMessage: 'Strongly discouraged, will impact downstream functionality',
    }
  ),
  [SYNTHETIC_SOURCE_OPTION]: i18n.translate(
    'xpack.idxMgmt.mappingsEditor.configuration.syntheticSourceFieldsDescription',
    {
      defaultMessage: 'Reconstructs source content to save on disk usage',
    }
  ),
};

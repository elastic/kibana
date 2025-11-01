/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SchemaEditorField } from './types';

const FIELD_RESULT_MAP = {
  new: {
    color: 'success' as const,
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorNewResultLabel', {
      defaultMessage: 'New',
    }),
  },
  modified: {
    color: 'warning' as const,
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorModifiedResultLabel', {
      defaultMessage: 'Modified',
    }),
  },
  unchanged: {
    color: 'default' as const,
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorUnchangedResultLabel', {
      defaultMessage: 'Unchanged',
    }),
  },
};

export const FieldResultBadge = ({ result }: { result: SchemaEditorField['result'] }) => {
  if (!result) {
    return null;
  }

  return (
    <EuiBadge color={FIELD_RESULT_MAP[result].color}>{FIELD_RESULT_MAP[result].label}</EuiBadge>
  );
};

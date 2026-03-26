/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SchemaEditorField } from './types';

const FIELD_RESULT_MAP = {
  created: {
    color: 'success' as const,
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorCreatedResultLabel', {
      defaultMessage: 'Created',
    }),
    tooltip: i18n.translate('xpack.streams.streamDetailSchemaEditorCreatedResultTooltip', {
      defaultMessage: 'The simulated processing steps newly create this field.',
    }),
  },
  modified: {
    color: 'warning' as const,
    label: i18n.translate('xpack.streams.streamDetailSchemaEditorModifiedResultLabel', {
      defaultMessage: 'Modified',
    }),
    tooltip: i18n.translate('xpack.streams.streamDetailSchemaEditorModifiedResultTooltip', {
      defaultMessage: 'The simulated processing steps modify the values of this field.',
    }),
  },
};

export const FieldResultBadge = ({ result }: { result: SchemaEditorField['result'] }) => {
  if (!result) {
    return null;
  }

  return (
    <EuiToolTip content={FIELD_RESULT_MAP[result].tooltip}>
      <EuiBadge tabIndex={0} color={FIELD_RESULT_MAP[result].color}>
        {FIELD_RESULT_MAP[result].label}
      </EuiBadge>
    </EuiToolTip>
  );
};

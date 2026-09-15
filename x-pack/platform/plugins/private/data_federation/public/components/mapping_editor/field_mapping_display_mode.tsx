/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { MappingEditorField } from './mapping_editor';
import { MappingActions } from './mapping_actions';

export interface FieldMappingDisplayModeProps {
  field: MappingEditorField;
  typeLabel?: string;
  onEdit: () => void;
  onRemove: () => void;
}

export const FieldMappingDisplayMode = ({
  field,
  typeLabel,
  onEdit,
  onRemove,
}: FieldMappingDisplayModeProps) => {
  return (
    <>
      <EuiFlexItem>
        <EuiText size="s">{field.name}</EuiText>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.dataFederation.mappingEditor.sourceLabel', {
            defaultMessage: 'Source: {source}',
            values: { source: field.path || field.name || '' },
          })}
        </EuiText>
      </EuiFlexItem>
      <MappingActions field={field} typeLabel={typeLabel} onEdit={onEdit} onRemove={onRemove} />
    </>
  );
};

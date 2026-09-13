/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { MouseEvent } from 'react';
import { EuiBadge, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { MappingEditorField } from './mapping_editor';

export interface MappingActionsProps {
  field: MappingEditorField;
  typeLabel?: string;
  onEdit: () => void;
  onRemove: () => void;
}

export const MappingActions = ({ field, typeLabel, onEdit, onRemove }: MappingActionsProps) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="s" direction="row" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          {field.type ? (
            <EuiBadge color="hollow">{typeLabel ?? field.type}</EuiBadge>
          ) : (
            <span aria-hidden="true">&nbsp;</span>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.dataFederation.mappingEditor.editField', {
              defaultMessage: 'Edit',
            })}
          >
            <EuiButtonIcon
              iconType="pencil"
              aria-label={i18n.translate('xpack.dataFederation.mappingEditor.editFieldAriaLabel', {
                defaultMessage: 'Edit field',
              })}
              type="button"
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit();
              }}
              data-test-subj="dataFederationMappingEditorEditField"
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.translate('xpack.dataFederation.mappingEditor.removeField', {
              defaultMessage: 'Remove',
            })}
          >
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              aria-label={i18n.translate(
                'xpack.dataFederation.mappingEditor.removeFieldAriaLabel',
                { defaultMessage: 'Remove field' }
              )}
              type="button"
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              data-test-subj="dataFederationMappingEditorRemoveField"
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

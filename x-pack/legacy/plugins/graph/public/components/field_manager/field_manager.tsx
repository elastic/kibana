/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { bindActionCreators } from 'redux';
import { FieldPicker } from './field_picker';
import { FieldEditor } from './field_editor';
import {
  selectedFieldsSelector,
  fieldsSelector,
  updateFieldProperties,
  selectField,
  deselectField,
  GraphDispatch,
  GraphState,
  fieldMapSelector,
} from '../../state_management';

export interface FieldManagerProps {
  state: GraphState;
  dispatch: GraphDispatch;
}

export function FieldManager({ state, dispatch }: FieldManagerProps) {
  const fieldMap = fieldMapSelector(state);
  const allFields = fieldsSelector(state);
  const selectedFields = selectedFieldsSelector(state);

  const actionCreators = bindActionCreators(
    {
      updateFieldProperties,
      selectField,
      deselectField,
    },
    dispatch
  );

  return (
    <I18nProvider>
      <EuiFlexGroup gutterSize="s" className="gphFieldManager" alignItems="center" wrap>
        {selectedFields.map(field => (
          <EuiFlexItem key={field.name} grow={false}>
            <FieldEditor allFields={allFields} {...actionCreators} field={field} />
          </EuiFlexItem>
        ))}
        <EuiFlexItem grow={false}>
          <FieldPicker fieldMap={fieldMap} {...actionCreators} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </I18nProvider>
  );
}

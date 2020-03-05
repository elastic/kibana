/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { FieldPicker } from './field_picker';
import { FieldEditor } from './field_editor';
import {
  selectedFieldsSelector,
  fieldsSelector,
  fieldMapSelector,
  updateFieldProperties,
  selectField,
  deselectField,
  GraphState,
  GraphStore,
} from '../../state_management';
import { WorkspaceField } from '../../types';

export type UpdateableFieldProperties = 'hopSize' | 'lastValidHopSize' | 'color' | 'icon';

export function FieldManagerComponent(props: {
  allFields: WorkspaceField[];
  fieldMap: Record<string, WorkspaceField>;
  selectedFields: WorkspaceField[];
  updateFieldProperties: (props: {
    fieldName: string;
    fieldProperties: Partial<Pick<WorkspaceField, UpdateableFieldProperties>>;
  }) => void;
  selectField: (fieldName: string) => void;
  deselectField: (fieldName: string) => void;
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
  store?: GraphStore; // only for testing purpose
}) {
  return (
    <EuiFlexGroup gutterSize="s" className="gphFieldManager" alignItems="center">
      {props.selectedFields.map(field => (
        <EuiFlexItem key={field.name} grow={false}>
          <FieldEditor {...props} field={field} />
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <FieldPicker {...props} open={props.pickerOpen} setOpen={props.setPickerOpen} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const FieldManager = connect(
  (state: GraphState) => ({
    fieldMap: fieldMapSelector(state),
    allFields: fieldsSelector(state),
    selectedFields: selectedFieldsSelector(state),
  }),
  dispatch =>
    bindActionCreators(
      {
        updateFieldProperties,
        selectField,
        deselectField,
      },
      dispatch
    )
)(FieldManagerComponent);

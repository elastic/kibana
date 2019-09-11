/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import {  EuiFlexGroup, EuiFlexItem  } from '@elastic/eui';
import { WorkspaceField } from '../../types';
import { FieldPicker } from './field_picker';

export interface GraphFieldManagerProps {
  allFields: WorkspaceField[];
  updateFieldProperties: (fieldName: string, fieldProperties: Pick<WorkspaceField, 'hopSize' | 'color' | 'icon'>) => void;
  selectField: (fieldName: string) => void;
  deselectField: (fieldName: string) => void;
}

export function GraphFieldManager(props: GraphFieldManagerProps) {
  const selectedFields = props.allFields.filter(field => field.selected);

  return (
    <I18nProvider>
      <EuiFlexGroup>
        {selectedFields.map(field => <FieldEditor {...props} field={field} />)}
        <EuiFlexItem grow={false}>
          <FieldPicker {...props} />
          </EuiFlexItem>
        </EuiFlexGroup>
    </I18nProvider>
  );
}
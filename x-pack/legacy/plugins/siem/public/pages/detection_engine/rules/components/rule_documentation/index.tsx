/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from 'styled-components';

import { NewNote } from '../../../../../components/notes/add_note/new_note';
import { FieldHook } from '../../../../shared_imports';

const DocumentationContainer = styled.div`
  margin-top: 16px;
`;

interface AddRuleDocumentationProps {
  field: FieldHook;
  dataTestSubj: string;
  idAria: string;
}

export const AddRuleDocumentation = ({
  dataTestSubj,
  field,
  idAria,
}: AddRuleDocumentationProps) => {
  const updateDocumentation = useCallback(
    (documentation: string) => {
      let value = field.value as string;
      value = documentation;
      field.setValue(value);
    },
    [field]
  );

  return (
    <DocumentationContainer>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow>
          <EuiFormRow
            label={field.label}
            labelAppend={field.labelAppend}
            describedByIds={idAria ? [idAria] : undefined}
            fullWidth
          >
            <NewNote
              noteInputHeight={200}
              updateNewNote={updateDocumentation.bind(null)}
              note={field.value}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </DocumentationContainer>
  );
};

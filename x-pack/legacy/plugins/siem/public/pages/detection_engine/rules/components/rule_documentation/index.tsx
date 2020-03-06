/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from 'styled-components';

import { MarkdownEditorForm } from '../../../../../components/markdown_editor/form';
import { FieldHook } from '../../../../shared_imports';
import * as i18n from './translations';

const DocumentationContainer = styled.div`
  margin-top: 16px;
`;

interface AddRuleDocumentationProps {
  field: FieldHook;
  dataTestSubj: string;
  idAria: string;
  isDisabled: boolean;
}

export const AddRuleDocumentation = ({
  dataTestSubj,
  field,
  idAria,
  isDisabled,
}: AddRuleDocumentationProps) => (
  <DocumentationContainer>
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={2}>
        <MarkdownEditorForm
          field={field}
          dataTestSubj={dataTestSubj}
          idAria={idAria}
          isDisabled={isDisabled}
          placeholder={i18n.ADD_DOCUMENTATION_HELP_TEXT}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  </DocumentationContainer>
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, EuiText, EuiSpacer } from '@elastic/eui';

import { useDispatch, useState } from '../mappings_state';
import { FieldsEditor } from '../types';
import { canUseMappingsEditor, normalize } from '../lib';

interface Props {
  editor: FieldsEditor;
}

/* TODO: Review toggle controls */
export const EditorToggleControls = ({ editor }: Props) => {
  const dispatch = useDispatch();
  const state = useState();

  const [showMaxDepthWarning, setShowMaxDepthWarning] = React.useState<boolean>(false);
  const [showValidityWarning, setShowValidityWarning] = React.useState<boolean>(false);

  const clearWarnings = () => {
    if (showMaxDepthWarning) setShowMaxDepthWarning(false);
    if (showValidityWarning) setShowValidityWarning(false);
  };

  if (editor === 'default') {
    clearWarnings();
    return (
      <EuiButton
        onClick={() => {
          dispatch({ type: 'documentField.changeEditor', value: 'json' });
        }}
      >
        Use JSON Editor
      </EuiButton>
    );
  }

  return (
    <>
      <EuiButton
        onClick={() => {
          clearWarnings();
          const deNormalizedFields = state.fieldsJsonEditor.format();
          const normalizedFields = normalize(deNormalizedFields);
          const maxDepthOk = canUseMappingsEditor(normalizedFields.maxNestedDepth);
          const validJSON = state.fieldsJsonEditor.isValid;

          if (maxDepthOk && validJSON) {
            dispatch({ type: 'documentField.changeEditor', value: 'default' });
          } else {
            if (!maxDepthOk) setShowMaxDepthWarning(true);
            if (!validJSON) setShowValidityWarning(true);
          }
        }}
      >
        Use Mappings Editor
      </EuiButton>
      {showMaxDepthWarning ? (
        <EuiText size="s" color="danger">
          Max depth for Mappings Editor exceeded
        </EuiText>
      ) : null}
      {showValidityWarning ? (
        <EuiText size="s" color="danger">
          JSON is invalid
        </EuiText>
      ) : null}
    </>
  );
};

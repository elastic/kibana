/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton, EuiText } from '@elastic/eui';

import { useDispatch, useMappingsState } from '../../mappings_state';
import { FieldsEditor } from '../../types';
import { canUseMappingsEditor, normalize } from '../../lib';

interface Props {
  editor: FieldsEditor;
}

/* TODO: Review toggle controls UI */
export const EditorToggleControls = ({ editor }: Props) => {
  const dispatch = useDispatch();
  const { fieldsJsonEditor } = useMappingsState();

  const [showMaxDepthWarning, setShowMaxDepthWarning] = React.useState<boolean>(false);
  const [showValidityWarning, setShowValidityWarning] = React.useState<boolean>(false);

  const clearWarnings = () => {
    if (showMaxDepthWarning) {
      setShowMaxDepthWarning(false);
    }

    if (showValidityWarning) {
      setShowValidityWarning(false);
    }
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
          const { isValid } = fieldsJsonEditor;
          if (!isValid) {
            setShowValidityWarning(true);
          } else {
            const deNormalizedFields = fieldsJsonEditor.format();
            const { maxNestedDepth } = normalize(deNormalizedFields);
            const canUseDefaultEditor = canUseMappingsEditor(maxNestedDepth);

            if (canUseDefaultEditor) {
              dispatch({ type: 'documentField.changeEditor', value: 'default' });
            } else {
              setShowMaxDepthWarning(true);
            }
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
      {showValidityWarning && !fieldsJsonEditor.isValid ? (
        <EuiText size="s" color="danger">
          JSON is invalid
        </EuiText>
      ) : null}
    </>
  );
};

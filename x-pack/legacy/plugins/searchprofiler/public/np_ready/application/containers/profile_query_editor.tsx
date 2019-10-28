/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useRef, memo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiForm,
  EuiFieldText,
  EuiFormRow,
  EuiButton,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { Editor, EditorInstance } from '../editor';
import { useDoProfile } from '../hooks';
import { useAppContext } from '../contexts/app_context';
import { useProfilerActionContext } from '../contexts/profiler_context';

const DEFAULT_INDEX_VALUE = '_all';

const INITIAL_EDITOR_VALUE = `{
  "query":{
    "match_all" : {}
  }
}`;

/**
 * This component should only need to render once.
 *
 * Drives state changes for mine via profiler action context.
 */
export const ProfileQueryEditor = memo(() => {
  const editorRef = useRef<EditorInstance>(null as any);
  const indexInputRef = useRef<HTMLInputElement>(null as any);
  const typeInputRef = useRef<HTMLInputElement>(null as any);

  const dispatch = useProfilerActionContext();

  const { licenseEnabled } = useAppContext();
  const doProfile = useDoProfile();

  const handleProfileClick = async () => {
    dispatch({ type: 'setProfiling', value: true });
    try {
      const { current: editor } = editorRef;
      editor.clearErrorAnnotations();
      const { data: result, error } = await doProfile({
        query: editorRef.current.getValue(),
        index: indexInputRef.current.value,
        type: typeInputRef.current.value,
      });
      if (error) {
        editor.addErrorAnnotation(error);
        editor.focus();
        return;
      }
      if (result === null) {
        return;
      }
      dispatch({ type: 'setCurrentResponse', value: result });
    } finally {
      dispatch({ type: 'setProfiling', value: false });
    }
  };

  const onEditorReady = useCallback(editorInstance => (editorRef.current = editorInstance), []);

  return (
    <div className="prfDevTool__sense">
      <EuiForm>
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem grow={1}>
            <EuiFormRow
              label={i18n.translate('xpack.searchProfiler.formIndexLabel', {
                defaultMessage: 'Index',
              })}
            >
              <EuiFieldText
                disabled={!licenseEnabled}
                inputRef={ref => {
                  indexInputRef.current = ref!;
                  ref!.value = DEFAULT_INDEX_VALUE;
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiFormRow
              label={i18n.translate('xpack.searchProfiler.formTypeLabel', {
                defaultMessage: 'Type',
              })}
            >
              <EuiFieldText
                disabled={!licenseEnabled}
                inputRef={ref => (typeInputRef.current = ref!)}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
      <Editor
        onEditorReady={onEditorReady}
        licenseEnabled={licenseEnabled}
        initialValue={INITIAL_EDITOR_VALUE}
      />
      <EuiButton disabled={!licenseEnabled} onClick={() => handleProfileClick()}>
        <EuiText>
          {i18n.translate('xpack.searchProfiler.formProfileButtonLabel', {
            defaultMessage: 'Profile',
          })}
        </EuiText>
      </EuiButton>
    </div>
  );
});

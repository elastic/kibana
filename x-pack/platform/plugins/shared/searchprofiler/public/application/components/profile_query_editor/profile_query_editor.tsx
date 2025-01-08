/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, memo, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiForm,
  EuiFieldText,
  EuiFormRow,
  EuiButton,
  EuiText,
  EuiFlexGroup,
  EuiSpacer,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';

import { decompressFromEncodedURIComponent } from 'lz-string';

import { useHasIndices, useRequestProfile } from '../../hooks';
import { useAppContext } from '../../contexts/app_context';
import { useProfilerActionContext } from '../../contexts/profiler_context';
import { Editor, type EditorProps } from './editor';

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
  const editorPropsRef = useRef<EditorProps>(null as any);
  const indexInputRef = useRef<HTMLInputElement>(null as any);

  const dispatch = useProfilerActionContext();

  const { getLicenseStatus, notifications, location } = useAppContext();

  const { data: indicesData, isLoading, error: indicesDataError } = useHasIndices();

  const queryParams = new URLSearchParams(location.search);
  const indexName = queryParams.get('index');
  const searchProfilerQueryURI = queryParams.get('load_from');

  const searchProfilerQuery =
    searchProfilerQueryURI &&
    decompressFromEncodedURIComponent(searchProfilerQueryURI.replace(/^data:text\/plain,/, ''));
  const [editorValue, setEditorValue] = useState(
    searchProfilerQuery ? searchProfilerQuery : INITIAL_EDITOR_VALUE
  );

  const requestProfile = useRequestProfile();

  const handleProfileClick = async () => {
    dispatch({ type: 'setProfiling', value: true });
    try {
      const { data: result, error } = await requestProfile({
        query: editorValue,
        index: indexInputRef.current.value,
      });
      if (error) {
        notifications.addDanger(error);
        editorPropsRef.current.focus();
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

  const onEditorReady = useCallback(
    (editorPropsInstance: EditorProps) => (editorPropsRef.current = editorPropsInstance),
    []
  );
  const licenseEnabled = getLicenseStatus().valid;

  const hasIndices = isLoading || indicesDataError ? false : indicesData?.hasIndices;

  const isDisabled = !licenseEnabled || !hasIndices;
  const tooltipContent = !licenseEnabled
    ? i18n.translate('xpack.searchProfiler.formProfileButton.noLicenseTooltip', {
        defaultMessage: 'You need an active license to use Search Profiler',
      })
    : i18n.translate('xpack.searchProfiler.formProfileButton.noIndicesTooltip', {
        defaultMessage: 'You must have at least one index to use Search Profiler',
      });

  const button = (
    <EuiButton
      data-test-subj={isDisabled ? 'disabledProfileButton' : 'profileButton'}
      fill
      disabled={isDisabled}
      onClick={!isDisabled ? handleProfileClick : undefined}
    >
      <EuiText>
        {i18n.translate('xpack.searchProfiler.formProfileButtonLabel', {
          defaultMessage: 'Profile',
        })}
      </EuiText>
    </EuiButton>
  );

  return (
    <EuiFlexGroup responsive={false} gutterSize="none" direction="column">
      {/* Form */}
      <EuiFlexItem grow={false}>
        <EuiForm>
          <EuiFlexGroup direction="row" gutterSize="s">
            <EuiFlexItem>
              <EuiFormRow
                label={i18n.translate('xpack.searchProfiler.formIndexLabel', {
                  defaultMessage: 'Index',
                })}
              >
                <EuiFieldText
                  data-test-subj="indexName"
                  disabled={!licenseEnabled}
                  inputRef={(ref) => {
                    if (ref) {
                      indexInputRef.current = ref;
                      ref.value = indexName ? indexName : DEFAULT_INDEX_VALUE;
                    }
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiForm>
      </EuiFlexItem>

      {/* Editor */}
      <EuiFlexItem grow={10}>
        <Editor
          onEditorReady={onEditorReady}
          setEditorValue={setEditorValue}
          editorValue={editorValue}
          licenseEnabled={licenseEnabled}
        />
      </EuiFlexItem>

      {/* Button */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          className="prfDevTool__profileButtonContainer"
          gutterSize="none"
          direction="row"
        >
          <EuiFlexItem grow={5}>
            <EuiSpacer size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={5}>
            {isDisabled ? (
              <EuiToolTip position="top" content={tooltipContent}>
                {button}
              </EuiToolTip>
            ) : (
              button
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

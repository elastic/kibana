/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, memo, useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  EuiForm,
  EuiFieldText,
  EuiFormRow,
  EuiButtonIcon,
  EuiFlexGroup,
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
  const tooltipContentDisabled = !licenseEnabled
    ? i18n.translate('xpack.searchProfiler.formProfileButton.noLicenseTooltip', {
        defaultMessage: 'You need an active license to use Search Profiler',
      })
    : i18n.translate('xpack.searchProfiler.formProfileButton.noIndicesTooltip', {
        defaultMessage: 'You must have at least one index to use Search Profiler',
      });

  const tooltipContentEnabled = i18n.translate(
    'xpack.searchProfiler.sendRequestButtonTooltipContent',
    {
      defaultMessage: 'Click to send request',
    }
  );

  const tooltipContent = isDisabled ? tooltipContentDisabled : tooltipContentEnabled;

  return (
    <EuiFlexGroup
      responsive={false}
      gutterSize="none"
      direction="column"
      css={css`
        height: 100%;
      `}
    >
      {/* Form */}
      <EuiFlexItem grow={false}>
        <EuiForm>
          <EuiFlexGroup responsive={false} direction="row" gutterSize="s" alignItems="flexEnd">
            <EuiFlexItem>
              <EuiFormRow
                fullWidth
                label={i18n.translate('xpack.searchProfiler.formIndexLabel', {
                  defaultMessage: 'Index',
                })}
              >
                <EuiFieldText
                  data-test-subj="indexName"
                  fullWidth
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
            <EuiFlexItem grow={false}>
              <EuiToolTip content={tooltipContent}>
                <EuiButtonIcon
                  iconType={'playFilled'}
                  data-test-subj={isDisabled ? 'disabledProfileButton' : 'profileButton'}
                  disabled={isDisabled}
                  onClick={!isDisabled ? handleProfileClick : undefined}
                  size="m"
                  display="base"
                  aria-label={i18n.translate('xpack.searchProfiler.formProfileButtonLabel', {
                    defaultMessage: 'Profile',
                  })}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiForm>
      </EuiFlexItem>

      {/* Editor */}
      <EuiFlexItem
        grow={1}
        css={css`
          overflow: hidden;
        `}
      >
        <Editor
          onEditorReady={onEditorReady}
          setEditorValue={setEditorValue}
          editorValue={editorValue}
          licenseEnabled={licenseEnabled}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

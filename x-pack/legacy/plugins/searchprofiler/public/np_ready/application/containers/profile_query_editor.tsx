/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useRef, memo } from 'react';
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
import { Editor } from '../editor';
import { useDoProfile } from '../hooks';
import { ShardSerialized } from '../types';
import { useAppContext } from '../app_context';

interface Props {
  onProfileClick: () => void;
  onResponse: (response: ShardSerialized[]) => void;
}

const DEFAULT_INDEX_VALUE = '_all';

const INITIAL_EDITOR_VALUE = `{
  "query":{
    "match_all" : {}
  }
}`;

export const ProfileQueryEditor = memo(({ onResponse, onProfileClick }: Props) => {
  const editorValueGetter = useRef<() => string>(null as any);
  const indexInputRef = useRef<HTMLInputElement>(null as any);
  const typeInputRef = useRef<HTMLInputElement>(null as any);

  const { licenseEnabled } = useAppContext();
  const doProfile = useDoProfile();

  const handleProfileClick = async () => {
    onProfileClick();
    const result = await doProfile({
      query: editorValueGetter.current!(),
      index: indexInputRef.current.value,
      type: typeInputRef.current.value,
    });
    if (result === null) {
      return;
    }
    onResponse(result);
  };

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
        valueGetterRef={editorValueGetter}
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

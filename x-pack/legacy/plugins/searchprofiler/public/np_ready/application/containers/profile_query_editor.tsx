/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useRef } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiForm, EuiFieldText, EuiFormRow, EuiButton, EuiText } from '@elastic/eui';
import { Editor } from '../editor';
import { useDoProfile } from '../hooks';
import { ShardSerialized } from '../types';
import { useAppContext } from '../app_context';

interface Props {
  onResponse: (response: ShardSerialized[]) => void;
}

export const ProfileQueryEditor = ({ onResponse }: Props) => {
  const indexInputRef = useRef<HTMLInputElement>(null as any);
  const typeInputRef = useRef<HTMLInputElement>(null as any);

  const { licenseEnabled } = useAppContext();
  const doProfile = useDoProfile();

  const handleProfileClick = async () => {
    // TODO: Finish adding request body
    const result = await doProfile({});
    onResponse(result);
  };

  return (
    <>
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.searchProfiler.formIndexLabel', { defaultMessage: 'Index' })}
        >
          <EuiFieldText inputRef={indexInputRef} />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.searchProfiler.formTypeLabel', { defaultMessage: 'Type' })}
        >
          <EuiFieldText inputRef={typeInputRef} />
        </EuiFormRow>
      </EuiForm>
      <Editor licenseEnabled={licenseEnabled} />
      <EuiButton onClick={() => handleProfileClick()}>
        <EuiText>
          {i18n.translate('xpack.searchProfiler.formProfileButtonLabel', {
            defaultMessage: 'Profile',
          })}
        </EuiText>
      </EuiButton>
    </>
  );
};

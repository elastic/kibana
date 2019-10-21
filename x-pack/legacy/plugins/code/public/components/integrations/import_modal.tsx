/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

interface Props {
  isInvalid: boolean;
  isLoading: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  onSubmit: () => void;
  value: string;
}

export const ImportModal = ({
  isInvalid,
  isLoading,
  onChange,
  onClose,
  onSubmit,
  value,
}: Props) => (
  <EuiOverlayMask>
    <EuiModal onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="xpack.code.adminPage.repoTab.importRepoTitle"
            defaultMessage="Import a new repo"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="xpack.code.adminPage.repoTab.repositoryUrlFormLabel"
              defaultMessage="Repository URL"
            />
          </h3>
        </EuiTitle>
        <EuiForm>
          <EuiFormRow
            isInvalid={isInvalid}
            error={i18n.translate('xpack.code.adminPage.repoTab.repositoryUrlEmptyText', {
              defaultMessage: "The URL shouldn't be empty.",
            })}
          >
            <EuiFieldText
              value={value}
              onChange={onChange}
              onBlur={onChange}
              placeholder="https://github.com/Microsoft/TypeScript-Node-Starter"
              aria-label="input project url"
              data-test-subj="importRepositoryUrlInputBox"
              isLoading={isLoading}
              fullWidth={true}
              isInvalid={isInvalid}
              autoFocus={true}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          <FormattedMessage
            id="xpack.code.adminPage.repoTab.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton fill onClick={onSubmit} disabled={isLoading}>
          <FormattedMessage
            id="xpack.code.adminPage.repoTab.importButtonLabel"
            defaultMessage="Import"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  </EuiOverlayMask>
);

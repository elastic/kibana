/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

interface Props {
  submit: () => void;
  disabled: boolean;
  toggleFlyout: () => void;
}

export function MainControls({ submit, disabled, toggleFlyout }: Props) {
  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiButton fill onClick={submit} isDisabled={disabled} data-test-subj="btnExecute">
          <FormattedMessage
            id="xpack.painless_playground.executeButtonLabel"
            defaultMessage="Execute"
          />
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          onClick={toggleFlyout}
          isDisabled={disabled}
          data-test-subj="btnViewRequest"
        >
          {i18n.translate('xpack.painless_playground.previewRequestButtonLabel', {
            defaultMessage: 'Preview Request',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

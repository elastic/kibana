/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface DisplayOptionRowProps {
  label: string;
  helpText: string;
  hideId: string;
  showId: string;
  isShown: boolean;
  onChange: (id: string) => void;
  testSubj: string;
}

export const DisplayOptionRow = ({
  label,
  helpText,
  hideId,
  showId,
  isShown,
  onChange,
  testSubj,
}: DisplayOptionRowProps) => (
  <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false} data-test-subj={testSubj}>
    <EuiFlexItem>
      <EuiText size="s">
        <strong>{label}</strong>
      </EuiText>
      <EuiText size="xs" color="subdued">
        {helpText}
      </EuiText>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButtonGroup
        legend={label}
        buttonSize="s"
        idSelected={isShown ? showId : hideId}
        onChange={onChange}
        options={[
          {
            id: showId,
            label: i18n.translate(
              'xpack.searchInferenceEndpoints.eisModelsPage.displayOptions.showButtonLabel',
              { defaultMessage: 'Show' }
            ),
            'data-test-subj': showId,
          },
          {
            id: hideId,
            label: i18n.translate(
              'xpack.searchInferenceEndpoints.eisModelsPage.displayOptions.hideButtonLabel',
              { defaultMessage: 'Hide' }
            ),
            'data-test-subj': hideId,
          },
        ]}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

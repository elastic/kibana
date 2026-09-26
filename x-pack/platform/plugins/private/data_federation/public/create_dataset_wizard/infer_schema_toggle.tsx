/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface InferSchemaToggleProps {
  dynamicMode: boolean;
  onDynamicModeChange: (nextDynamic: boolean) => void;
}

export function InferSchemaToggle({ dynamicMode, onDynamicModeChange }: InferSchemaToggleProps) {
  return (
    <>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiCheckableCard
            id="createDatasetWizardInferSchema"
            label={
              <EuiText size="s">
                <strong>
                  {i18n.translate('xpack.dataFederation.createDatasetWizard.inferSchemaLabel', {
                    defaultMessage: 'Infer schema',
                  })}
                </strong>
              </EuiText>
            }
            checked={dynamicMode}
            onChange={() => onDynamicModeChange(true)}
            data-test-subj="createDatasetWizardInferSchemaCard"
          >
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.dataFederation.createDatasetWizard.inferSchemaDescription', {
                defaultMessage:
                  "Schema will be inferred at query time for any fields that haven't been mapped.",
              })}
            </EuiText>
          </EuiCheckableCard>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiCheckableCard
            id="createDatasetWizardDefineSchema"
            label={
              <EuiText size="s">
                <strong>
                  {i18n.translate('xpack.dataFederation.createDatasetWizard.defineSchemaLabel', {
                    defaultMessage: 'Define schema',
                  })}
                </strong>
              </EuiText>
            }
            checked={!dynamicMode}
            onChange={() => onDynamicModeChange(false)}
            data-test-subj="createDatasetWizardDefineSchemaCard"
          >
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.dataFederation.createDatasetWizard.defineSchemaDescription', {
                defaultMessage:
                  'No schema will be inferred at query time, only fields defined below will be available.',
              })}
            </EuiText>
          </EuiCheckableCard>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="m" />
    </>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SchemaResolutionField } from '../components/fields/schema_resolution_field';

const fillFlexItemStyles = css({ flexGrow: 1 });

export interface InferSchemaToggleProps {
  dynamicMode: boolean;
  onDynamicModeChange: (nextDynamic: boolean) => void;
}

export function InferSchemaToggle({ dynamicMode, onDynamicModeChange }: InferSchemaToggleProps) {
  return (
    <>
      <EuiHorizontalRule margin="m" />
      <EuiFlexGroup gutterSize="m" responsive={false} alignItems="stretch">
        <EuiFlexItem>
          <EuiCheckableCard
            id="createDatasetWizardInferSchema"
            css={fillFlexItemStyles}
            label={
              <EuiText size="s">
                <strong>
                  {i18n.translate('xpack.dataFederation.createDatasetWizard.inferSchemaLabel', {
                    defaultMessage: 'Infer unmapped fields',
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
                  "Elastic infers any fields you don't map. All fields are available to query.",
              })}
            </EuiText>

            <SchemaResolutionField isDisabled={!dynamicMode} />
          </EuiCheckableCard>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiCheckableCard
            id="createDatasetWizardDefineSchema"
            css={fillFlexItemStyles}
            label={
              <EuiText size="s">
                <strong>
                  {i18n.translate('xpack.dataFederation.createDatasetWizard.defineSchemaLabel', {
                    defaultMessage: 'Use mapped fields only',
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
                defaultMessage: 'Only fields you map are available to query.',
              })}
            </EuiText>
          </EuiCheckableCard>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="m" />
    </>
  );
}

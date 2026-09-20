/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetStateAction } from 'react';
import React, { useCallback } from 'react';
import { EuiAccordion, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useController, useFormContext } from 'react-hook-form';

import type { CreateDatasetFormValues } from './create_dataset_form_state';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import type { DataFederationKibanaServices } from '../types';
import { MappingEditor, type MappingEditorValue } from '../components/mapping_editor';

export function StepMapping() {
  const {
    services: { docLinks },
  } = useKibana<DataFederationKibanaServices>();
  const { control } = useFormContext<CreateDatasetFormValues>();
  const { field } = useController({ name: 'mappings', control });

  const onChange = useCallback(
    (next: SetStateAction<MappingEditorValue>) => {
      const resolved =
        typeof next === 'function'
          ? (next as (prev: MappingEditorValue) => MappingEditorValue)(field.value)
          : next;
      field.onChange(resolved);
    },
    [field]
  );

  return (
    <div data-test-subj="createDatasetWizardMappingStep">
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.dataFederation.createDatasetWizard.schemaMappingsTitle', {
            defaultMessage: 'Schema mappings',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.dataFederation.createDatasetWizard.schemaMappingsDescription', {
            defaultMessage:
              "Optional definition of how documents should be indexed. Elastic infers the schema at query time by default. You can manually map desired fields below, and we'll infer the rest of the schema.",
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      <EuiAccordion
        id="createDatasetWizardMappedFields"
        data-test-subj="createDatasetWizardMappedFields"
        buttonContent={
          <h4 style={{ margin: 0, fontWeight: 'bold' }}>
            {createDatasetWizardStrings.mappedFieldsSectionTitle}
          </h4>
        }
        initialIsOpen
        paddingSize="m"
      >
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.dataFederation.createDatasetWizard.timestampRecommendation', {
            defaultMessage:
              'Mapping your timestamp field and renaming it to @timestamp is recommended.',
          })}
        </EuiText>
        <EuiSpacer size="m" />
        <MappingEditor value={field.value} onChange={onChange} docLinks={docLinks} />
      </EuiAccordion>
    </div>
  );
}

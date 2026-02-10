/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode, EuiFieldText, EuiFormRow, EuiSpacer, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { UriPartsProcessor } from '@kbn/streamlang';
import { useController } from 'react-hook-form';
import { ProcessorFieldSelector } from '../processor_field_selector';
import { FieldsAccordion } from '../optional_fields_accordion';
import { IgnoreFailureToggle, IgnoreMissingToggle } from '../ignore_toggles';
import { ProcessorConditionEditor } from '../processor_condition_editor';

export type UriPartsFormState = UriPartsProcessor;

export const UriPartsProcessorForm = () => {
  const { field: toField, fieldState: toFieldState } = useController<UriPartsFormState, 'to'>({
    name: 'to',
    // Optional, defaults to "url" on the ingest processor side
  });

  const { field: keepOriginalField } = useController<UriPartsFormState, 'keep_original'>({
    name: 'keep_original',
  });

  const { field: removeIfSuccessfulField } = useController<
    UriPartsFormState,
    'remove_if_successful'
  >({
    name: 'remove_if_successful',
  });

  return (
    <>
      <ProcessorFieldSelector
        fieldKey="from"
        helpText={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsFieldHelpText',
          { defaultMessage: 'Field containing the URI string.' }
        )}
      />

      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsTargetFieldLabel',
          { defaultMessage: 'Target field' }
        )}
        helpText={
          <FormattedMessage
            id="xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsTargetFieldHelpText"
            defaultMessage="Prefix used to store parsed URI parts. If empty, defaults to {defaultValue}."
            values={{
              defaultValue: <EuiCode>url</EuiCode>,
            }}
          />
        }
        isInvalid={toFieldState.invalid}
        error={toFieldState.error?.message}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="streamsAppUriPartsTargetFieldInput"
          placeholder="url"
          value={toField.value ?? ''}
          onChange={toField.onChange}
          isInvalid={toFieldState.invalid}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <FieldsAccordion>
        <EuiFormRow
          fullWidth
          helpText={
            <FormattedMessage
              id="xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsKeepOriginalHelpText"
              defaultMessage="When enabled, the unparsed URI is copied to {field}."
              values={{
                field: <EuiCode>{'${target_field}.original'}</EuiCode>,
              }}
            />
          }
        >
          <EuiSwitch
            label={i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsKeepOriginalLabel',
              { defaultMessage: 'Keep original' }
            )}
            checked={keepOriginalField.value ?? false}
            onChange={(e) => keepOriginalField.onChange(e.target.checked)}
            compressed
          />
        </EuiFormRow>

        <EuiFormRow
          fullWidth
          helpText={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsRemoveIfSuccessfulHelpText',
            {
              defaultMessage: 'When enabled, the source field is removed after a successful parse.',
            }
          )}
        >
          <EuiSwitch
            label={i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.uriPartsRemoveIfSuccessfulLabel',
              { defaultMessage: 'Remove source field if successful' }
            )}
            checked={removeIfSuccessfulField.value ?? false}
            onChange={(e) => removeIfSuccessfulField.onChange(e.target.checked)}
            compressed
          />
        </EuiFormRow>

        <EuiSpacer size="m" />
        <ProcessorConditionEditor />
      </FieldsAccordion>

      <EuiSpacer size="m" />
      <IgnoreFailureToggle />
      <IgnoreMissingToggle />
    </>
  );
};

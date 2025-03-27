/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiFieldText, EuiCallOut, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useController } from 'react-hook-form';
import { css } from '@emotion/react';
import { ProcessorFormState } from '../types';
import { useSimulatorSelector } from '../state_management/stream_enrichment_state_machine';
import { selectUnsupportedDottedFields } from '../state_management/simulation_state_machine/selectors';

export const ProcessorFieldSelector = () => {
  const { euiTheme } = useEuiTheme();

  const unsupportedFields = useSimulatorSelector((state) =>
    selectUnsupportedDottedFields(state.context)
  );

  const { field, fieldState } = useController<ProcessorFormState, 'field'>({
    name: 'field',
    rules: {
      required: i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorRequiredError',
        { defaultMessage: 'A field value is required.' }
      ),
    },
  });

  const { ref, value, ...inputProps } = field;
  const { invalid, error } = fieldState;

  const isUnsupported = unsupportedFields.has(value);

  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorLabel',
          { defaultMessage: 'Field' }
        )}
        helpText={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorHelpText',
          { defaultMessage: 'Field to search for matches.' }
        )}
        isInvalid={invalid}
        error={error?.message}
      >
        <EuiFieldText
          data-test-subj="streamsAppProcessorFieldSelectorFieldText"
          {...inputProps}
          value={value}
          inputRef={ref}
          isInvalid={invalid}
        />
      </EuiFormRow>
      {isUnsupported && (
        <EuiCallOut
          color="warning"
          iconType="alert"
          title={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorUnsupportedDottedFieldsWarning.title',
            {
              defaultMessage: 'Dot-separated field names are partially supported.',
            }
          )}
          css={css`
            margin-top: ${euiTheme.size.s};
            margin-bottom: ${euiTheme.size.m};
          `}
        >
          <p>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorUnsupportedDottedFieldsWarning.p1',
              {
                defaultMessage:
                  'Using field names with dots may lead to misleading simulation results.',
              }
            )}
          </p>
          <p>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorUnsupportedDottedFieldsWarning.p2',
              {
                defaultMessage:
                  'Currently, our tool does not fully support this scenario, which combines nested fields and dotted field names.',
              }
            )}
          </p>
          <p>
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.processor.fieldSelectorUnsupportedDottedFieldsWarning.p3',
              {
                defaultMessage:
                  'We are working to improve support for such cases. For accurate results, consider avoiding dotted field names or expanding them into nested objects until this feature is fully implemented.',
              }
            )}
          </p>
        </EuiCallOut>
      )}
    </>
  );
};

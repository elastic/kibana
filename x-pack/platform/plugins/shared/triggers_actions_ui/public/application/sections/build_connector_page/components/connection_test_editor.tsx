/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFieldText, EuiFormErrorText, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Controller, useFormContext, useFormState } from 'react-hook-form';
import type { BuildConnectorFormData } from '../types';
import { RequestEditor } from './request_editor';

const TEST_TEST_SUBJ = 'buildConnectorTest';

/** The optional request that checks a connector of this type; left empty, no test is defined. */
const ConnectionTestEditorComponent: React.FC = () => {
  const { control } = useFormContext<BuildConnectorFormData>();
  const { errors } = useFormState({ control, name: 'test' });

  return (
    <div data-test-subj={TEST_TEST_SUBJ}>
      <EuiText size="xs" color="subdued" data-test-subj={`${TEST_TEST_SUBJ}-intro`}>
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.buildConnectorPage.testIntro"
          defaultMessage="Optional. A request users can run to check that a connector of this type is set up correctly. It can use {config} and {secrets} values, but not action input. Leave it empty to skip."
          values={{ config: <code>config</code>, secrets: <code>secrets</code> }}
        />
      </EuiText>
      {errors.test?.root?.message && (
        <EuiFormErrorText data-test-subj={`${TEST_TEST_SUBJ}-error`}>
          {errors.test.root.message}
        </EuiFormErrorText>
      )}
      <EuiSpacer size="s" />
      <Controller
        name="test.description"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <EuiFormRow
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.testDescriptionLabel',
              { defaultMessage: 'Description' }
            )}
            fullWidth
            isInvalid={!!error}
            error={error?.message}
          >
            <EuiFieldText
              fullWidth
              isInvalid={!!error}
              data-test-subj={`${TEST_TEST_SUBJ}-description`}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              inputRef={field.ref}
            />
          </EuiFormRow>
        )}
      />
      <EuiSpacer size="s" />
      <RequestEditor
        requestPath="test.request"
        testSubj={TEST_TEST_SUBJ}
        allowInputReferences={false}
      />
    </div>
  );
};

export const ConnectionTestEditor = memo(ConnectionTestEditorComponent);

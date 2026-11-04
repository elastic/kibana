/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { Controller, useFormContext, useFormState } from 'react-hook-form';
import type { BuildConnectorFormData, ConnectorTypeHttpMethod, RequestPath } from '../types';
import { HeaderListEditor } from './header_list_editor';
import { JsonBodyEditor } from './json_body_editor';

interface Props {
  requestPath: RequestPath;
  /** Prefix of the `data-test-subj` attributes: `-method`, `-url`, `-path`, `-headers`, `-body`. */
  testSubj: string;
  /** The connection test has no action input to reference. */
  allowInputReferences?: boolean;
}

const methodOptions: Array<{ value: ConnectorTypeHttpMethod; text: string }> = (
  ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
).map((method) => ({ value: method, text: method }));

/** Method, URL, path, headers and JSON body of an HTTP request. */
const RequestEditorComponent: React.FC<Props> = ({
  requestPath,
  testSubj,
  allowInputReferences = true,
}) => {
  const { control } = useFormContext<BuildConnectorFormData>();
  const { errors } = useFormState({ control, name: requestPath });
  const rootError: string | undefined = get(errors, `${requestPath}.root.message`);

  return (
    <>
      {rootError && (
        <>
          <EuiFormErrorText data-test-subj={`${testSubj}-request-error`}>
            {rootError}
          </EuiFormErrorText>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <Controller
            name={`${requestPath}.method`}
            control={control}
            render={({ field, fieldState: { error } }) => (
              <EuiFormRow
                label={i18n.translate(
                  'xpack.triggersActionsUI.sections.buildConnectorPage.methodLabel',
                  { defaultMessage: 'Method' }
                )}
                isInvalid={!!error}
                error={error?.message}
              >
                <EuiSelect
                  isInvalid={!!error}
                  options={methodOptions}
                  data-test-subj={`${testSubj}-method`}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                />
              </EuiFormRow>
            )}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <Controller
            name={`${requestPath}.url`}
            control={control}
            render={({ field, fieldState: { error } }) => (
              <EuiFormRow
                label={i18n.translate(
                  'xpack.triggersActionsUI.sections.buildConnectorPage.urlLabel',
                  { defaultMessage: 'URL' }
                )}
                fullWidth
                isInvalid={!!error}
                error={error?.message}
              >
                <EuiFieldText
                  fullWidth
                  isInvalid={!!error}
                  data-test-subj={`${testSubj}-url`}
                  placeholder="{{config.baseUrl}}"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value)}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                />
              </EuiFormRow>
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <Controller
        name={`${requestPath}.path`}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <EuiFormRow
            label={i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.pathLabel', {
              defaultMessage: 'Path',
            })}
            fullWidth
            isInvalid={!!error}
            error={error?.message}
          >
            <EuiFieldText
              fullWidth
              isInvalid={!!error}
              data-test-subj={`${testSubj}-path`}
              value={field.value ?? ''}
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              inputRef={field.ref}
            />
          </EuiFormRow>
        )}
      />
      <EuiSpacer size="s" />
      <HeaderListEditor requestPath={requestPath} testSubjPrefix={`${testSubj}-headers`} />
      <EuiSpacer size="s" />
      <JsonBodyEditor
        requestPath={requestPath}
        testSubj={`${testSubj}-body`}
        allowInputReferences={allowInputReferences}
      />
    </>
  );
};

export const RequestEditor = memo(RequestEditorComponent);

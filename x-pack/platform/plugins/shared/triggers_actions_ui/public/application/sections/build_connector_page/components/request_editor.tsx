/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { Controller, useFormContext, useFormState } from 'react-hook-form';
import type { BuildConnectorFormData, ConnectorTypeHttpMethod, RequestPath } from '../types';
import { HeaderListEditor } from './header_list_editor';
import { JsonBodyEditor } from './json_body_editor';
import { TemplateVariables } from './template_variables';

interface Props {
  requestPath: RequestPath;
  /** Prefix of the `data-test-subj` attributes: `-method`, `-url`, `-path`, `-headers`, `-body`. */
  testSubj: string;
  /** The connection test has no action input to reference. */
  allowInputReferences?: boolean;
  /** Index of the action this request belongs to; its params are offered as variables. */
  actionIndex?: number;
}

const methodOptions: Array<{ value: ConnectorTypeHttpMethod; text: string }> = (
  ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
).map((method) => ({ value: method, text: method }));

const LABELS = {
  method: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.methodLabel', {
    defaultMessage: 'Method',
  }),
  url: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.urlLabel', {
    defaultMessage: 'URL',
  }),
  path: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.pathLabel', {
    defaultMessage: 'Path',
  }),
  headers: i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.headersLabel', {
    defaultMessage: 'Headers',
  }),
};

const methodCellCss = css({ width: 110 });
const urlCellCss = css({ minWidth: 240 });
const pathCellCss = css({ minWidth: 160 });

/** Method, URL, path, headers and JSON body of an HTTP request. */
const RequestEditorComponent: React.FC<Props> = ({
  requestPath,
  testSubj,
  allowInputReferences = true,
  actionIndex,
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
      <EuiFlexGroup gutterSize="s" alignItems="flexStart" wrap responsive={false}>
        <EuiFlexItem grow={false} css={methodCellCss}>
          <Controller
            name={`${requestPath}.method`}
            control={control}
            render={({ field, fieldState: { error } }) => (
              <EuiFormRow
                label={LABELS.method}
                fullWidth
                isInvalid={!!error}
                error={error?.message}
              >
                <EuiSelect
                  fullWidth
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
        <EuiFlexItem grow={3} css={urlCellCss}>
          <Controller
            name={`${requestPath}.url`}
            control={control}
            render={({ field, fieldState: { error } }) => (
              <EuiFormRow label={LABELS.url} fullWidth isInvalid={!!error} error={error?.message}>
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
        <EuiFlexItem grow={2} css={pathCellCss}>
          <Controller
            name={`${requestPath}.path`}
            control={control}
            render={({ field, fieldState: { error } }) => (
              <EuiFormRow label={LABELS.path} fullWidth isInvalid={!!error} error={error?.message}>
                <EuiFieldText
                  fullWidth
                  isInvalid={!!error}
                  data-test-subj={`${testSubj}-path`}
                  placeholder={allowInputReferences ? '/items/{{input.id}}' : '/health'}
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
      <EuiSpacer size="m" />
      <TemplateVariables
        actionIndex={allowInputReferences ? actionIndex : undefined}
        testSubj={`${testSubj}-variables`}
      />
      <EuiSpacer size="l" />
      <EuiText size="xs">
        <strong>{LABELS.headers}</strong>
      </EuiText>
      <EuiSpacer size="s" />
      <HeaderListEditor requestPath={requestPath} testSubjPrefix={`${testSubj}-headers`} />
      <EuiSpacer size="l" />
      <JsonBodyEditor
        requestPath={requestPath}
        testSubj={`${testSubj}-body`}
        allowInputReferences={allowInputReferences}
      />
    </>
  );
};

export const RequestEditor = memo(RequestEditorComponent);

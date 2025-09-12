/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
import type { ActionParamsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { JsonEditorWithMessageVariables } from '@kbn/triggers-actions-ui-plugin/public';

import type { HttpRequestActionParams } from '.';

const HttpRequestParamsFields: React.FunctionComponent<
  ActionParamsProps<HttpRequestActionParams>
> = ({ actionParams, editAction, index, messageVariables, errors, actionConnector }) => {
  const { body } = actionParams;
  const contentType = (actionConnector as any).config;

  return contentType === 'json' ? (
    <JsonEditorWithMessageVariables
      messageVariables={messageVariables}
      paramsProperty={'body'}
      inputTargetValue={body}
      label={i18n.translate('xpack.stackConnectors.components.httpRequest.bodyFieldLabel', {
        defaultMessage: 'Body',
      })}
      ariaLabel={i18n.translate(
        'xpack.stackConnectors.components.httpRequest.bodyCodeEditorAriaLabel',
        {
          defaultMessage: 'Code editor',
        }
      )}
      errors={errors.body as string[]}
      onDocumentsChange={(json: string) => {
        editAction('body', json, index);
      }}
      onBlur={() => {
        if (!body) {
          editAction('body', '', index);
        }
      }}
      dataTestSubj="actionJsonEditor"
    />
  ) : (
    <CodeEditor
      languageId={'xml'}
      options={{
        renderValidationDecorations: 'off',
        lineNumbers: 'on',
        fontSize: 14,
        minimap: {
          enabled: false,
        },
        scrollBeyondLastLine: false,
        folding: true,
        wordWrap: 'on',
        wrappingIndent: 'indent',
        automaticLayout: true,
      }}
      value={body || ''}
      width="100%"
      height="200px"
      data-test-subj={`${contentType}Editor`}
      onChange={(val: string) => {
        editAction('body', val, index);
      }}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export { HttpRequestParamsFields as default };

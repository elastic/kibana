/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiForm, EuiFormRow } from '@elastic/eui';
import React from 'react';
import type { ESQLEditorProps } from '@kbn/esql/public';
import { ESQLLangEditor } from '@kbn/esql/public';
import { i18n } from '@kbn/i18n';
import { StreamNameFormRow } from '../stream_name_form_row';

export function QueryStreamForm({ children }: React.PropsWithChildren<{}>) {
  return <EuiForm fullWidth>{children}</EuiForm>;
}

QueryStreamForm.StreamName = StreamNameFormRow;
QueryStreamForm.ESQLEditor = ({
  errors,
  query,
  onTextLangQueryChange,
  onTextLangQuerySubmit,
  isLoading,
}: Pick<
  ESQLEditorProps,
  'errors' | 'query' | 'onTextLangQueryChange' | 'onTextLangQuerySubmit' | 'isLoading'
>) => (
  <EuiFormRow
    label={i18n.translate('xpack.streams.queryStreamForm.esqlEditorLabel', {
      defaultMessage: 'ES|QL Query',
    })}
    data-test-subj="queryStreamEsqlEditor"
    fullWidth
  >
    <ESQLLangEditor
      disableAutoFocus
      editorIsInline
      errors={errors}
      expandToFitQueryOnMount
      hasOutline
      hideRunQueryButton
      isLoading={isLoading}
      mergeExternalMessages
      onTextLangQueryChange={onTextLangQueryChange}
      onTextLangQuerySubmit={onTextLangQuerySubmit}
      query={query}
    />
  </EuiFormRow>
);

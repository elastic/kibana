/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { ESQLLangEditor } from '@kbn/esql/public';
import { noop } from 'lodash';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { promisify } from 'util';
import { useEsqlParamsValidation } from '../../hooks/use_esql_params_validation';
import type { EsqlToolFormData } from '../../types/tool_form_types';

export const EsqlEditorField = React.memo(() => {
  const { euiTheme } = useEuiTheme();
  const { control, formState, trigger } = useFormContext<EsqlToolFormData>();
  const { isSubmitted } = formState;

  const { triggerEsqlParamWarnings } = useEsqlParamsValidation();

  return (
    <Controller
      control={control}
      name="esql"
      render={({ field: { onBlur, ...field } }) => (
        <div
          data-test-subj="agentBuilderEsqlEditor"
          onBlur={() => {
            if (isSubmitted) {
              trigger('esql');
            } else {
              triggerEsqlParamWarnings();
            }
          }}
          css={css`
            margin-top: -${euiTheme.size.base};
          `}
        >
          <ESQLLangEditor
            query={{ esql: field.value }}
            onTextLangQueryChange={(query) => {
              field.onChange(query.esql);
              if (isSubmitted) {
                triggerEsqlParamWarnings();
              }
            }}
            onTextLangQuerySubmit={promisify(noop)} // Required prop, but we don't need it
            editorIsInline
            hasOutline
            hideRunQueryButton
            hideQueryHistory
            disableAutoFocus
            initialState={{
              editorHeight: 360,
            }}
            errors={[]} // Hides the initial error message, won't prevent future errors
          />
        </div>
      )}
    />
  );
});

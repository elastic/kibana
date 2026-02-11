/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ESQLLangEditor } from '@kbn/esql/public';
import { FieldGroup } from '@kbn/alerting-v2-rule-form/form/field_groups/field_group';
import { EuiFormRow } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { Controller, type FieldErrors } from 'react-hook-form';
import type { FormValues } from '@kbn/alerting-v2-rule-form';
import { validateEsqlQuery } from '@kbn/alerting-v2-schemas';

interface QueryEditorProps {
  control: any;
  errors: FieldErrors<FormValues>;
  isReadOnly?: boolean;
}

export const RuleData: React.FC<QueryEditorProps> = ({ control, errors, isReadOnly = false }) => {
  return (
    <FieldGroup
      title={i18n.translate('xpack.alertingV2.createRuleForm.ruleData', {
        defaultMessage: 'Rule data',
      })}
    >
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.alertingV2.createRule.queryLabel"
            defaultMessage="ES|QL Query"
          />
        }
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.alertingV2.createRule.queryHelpText"
            defaultMessage="Define the ES|QL query to execute for this rule."
          />
        }
        isInvalid={!!errors.query}
        error={errors.query?.message}
      >
        <Controller
          control={control}
          name="query"
          rules={{
            required: i18n.translate('xpack.alertingV2.createRule.queryRequiredError', {
              defaultMessage: 'ES|QL query is required.',
            }),
            validate: (value) => {
              const error = validateEsqlQuery(value);
              return error || true;
            },
          }}
          render={({ field }) => (
            <ESQLLangEditor
              query={{ esql: field.value }}
              onTextLangQueryChange={(newQuery) => {
                field.onChange(newQuery.esql || '');
              }}
              onTextLangQuerySubmit={async () => {}}
              isDisabled={isReadOnly}
              hideRunQueryText={true}
              hideRunQueryButton={true}
              editorIsInline={true}
              disableSubmitAction={true}
              hasOutline={true}
              hideQueryHistory={true}
              hideQuickSearch={true}
              expandToFitQueryOnMount={true}
            />
          )}
        />
      </EuiFormRow>
    </FieldGroup>
  );
};

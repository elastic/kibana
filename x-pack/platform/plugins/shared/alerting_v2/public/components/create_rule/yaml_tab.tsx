/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { YamlRuleEditor } from '@kbn/yaml-rule-editor';
import { RuleFooter } from './rule_footer';

interface YamlTabProps {
  yaml: string;
  onYamlChange: (value: string) => void;
  onYamlBlur: () => void;
  onSave: () => void;
  onCancel: () => void;
  esqlCallbacks: ESQLCallbacks;
  isReadOnly: boolean;
  isSubmitting: boolean;
  isEditing: boolean;
  error: React.ReactNode | null;
  errorTitle: React.ReactNode | null;
}

export const YamlTab = ({
  yaml,
  onYamlChange,
  onYamlBlur,
  onSave,
  onCancel,
  esqlCallbacks,
  isReadOnly,
  isSubmitting,
  isEditing,
  error,
  errorTitle,
}: YamlTabProps) => {
  return (
    <>
      <EuiSpacer size="m" />
      {error ? (
        <>
          <EuiCallOut
            title={
              errorTitle ?? (
                <FormattedMessage
                  id="xpack.alertingV2.createRule.errorTitle"
                  defaultMessage="Failed to create rule"
                />
              )
            }
            color="danger"
            iconType="error"
            announceOnMount
          >
            {error}
          </EuiCallOut>
          <EuiSpacer />
        </>
      ) : null}
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.alertingV2.createRule.yamlLabel"
            defaultMessage="Rule definition (YAML)"
          />
        }
        fullWidth
        helpText={
          <FormattedMessage
            id="xpack.alertingV2.createRule.yamlHelpText"
            defaultMessage="Paste the rule payload as YAML. ES|QL autocomplete is available within the query field."
          />
        }
      >
        <div onBlur={onYamlBlur}>
          <YamlRuleEditor
            value={yaml}
            onChange={onYamlChange}
            esqlCallbacks={esqlCallbacks}
            isReadOnly={isReadOnly}
            dataTestSubj="alertingV2CreateRuleYaml"
          />
        </div>
      </EuiFormRow>
      <EuiSpacer />
      <RuleFooter
        onSave={onSave}
        onCancel={onCancel}
        isSubmitting={isSubmitting}
        isEditing={isEditing}
      />
    </>
  );
};

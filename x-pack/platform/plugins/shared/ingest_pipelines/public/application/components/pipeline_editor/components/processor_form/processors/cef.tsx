/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode } from '@elastic/eui';

import type { FieldsConfig } from './shared';
import { from, to } from './shared';
import { FieldNameField } from './common_fields/field_name_field';
import { IgnoreMissingField } from './common_fields/ignore_missing_field';
import { TargetField } from './common_fields/target_field';
import { FIELD_TYPES, UseField, Field, ToggleField } from '../../../../../../shared_imports';

const fieldsConfig: FieldsConfig = {
  timezone: {
    type: FIELD_TYPES.TEXT,
    serializer: from.emptyStringToUndefined,
    label: i18n.translate('xpack.ingestPipelines.pipelineEditor.cefForm.timezoneFieldLabel', {
      defaultMessage: 'Time zone (optional)',
    }),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.cefForm.timezoneHelpText"
        defaultMessage="Time zone for date fields in the CEF message. Defaults to {timezone}."
        values={{ timezone: <EuiCode>{'UTC'}</EuiCode> }}
      />
    ),
  },
  ignore_empty_values: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(true),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.cefForm.ignoreEmptyValuesFieldLabel',
      {
        defaultMessage: 'Ignore empty values',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.cefForm.ignoreEmptyValuesHelpText"
        defaultMessage="If true, keys with empty values are ignored. Defaults to {defaultValue}."
        values={{ defaultValue: <EuiCode>{'true'}</EuiCode> }}
      />
    ),
  },
};

export const Cef: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate('xpack.ingestPipelines.pipelineEditor.cefForm.fieldNameHelpText', {
          defaultMessage: 'Field containing the CEF message to parse.',
        })}
      />

      <TargetField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.cefForm.targetFieldHelpText',
          {
            defaultMessage:
              'Output field for the parsed CEF object. Any existing content will be overwritten.',
          }
        )}
      />

      <UseField
        data-test-subj="timezoneField"
        config={fieldsConfig.timezone}
        component={Field}
        path="fields.timezone"
      />

      <UseField
        data-test-subj="ignoreEmptyValuesSwitch"
        config={fieldsConfig.ignore_empty_values}
        component={ToggleField}
        path="fields.ignore_empty_values"
      />

      <IgnoreMissingField
        helpText={
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.cefForm.ignoreMissingHelpText"
            defaultMessage="If true and {field} does not exist or is null, the processor exits without modifying the document. Defaults to {defaultValue}."
            values={{
              field: <EuiCode>{'field'}</EuiCode>,
              defaultValue: <EuiCode>{'false'}</EuiCode>,
            }}
          />
        }
      />
    </>
  );
};

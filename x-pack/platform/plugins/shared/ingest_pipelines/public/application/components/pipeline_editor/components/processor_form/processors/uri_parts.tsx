/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode } from '@elastic/eui';

import { FIELD_TYPES, UseField, ToggleField } from '../../../../../../shared_imports';

import { FieldsConfig, to, from } from './shared';

import { FieldNameField } from './common_fields/field_name_field';
import { TargetField } from './common_fields/target_field';

export const fieldsConfig: FieldsConfig = {
  keep_original: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: true,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(true),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.commonFields.keepOriginalFieldLabel',
      {
        defaultMessage: 'Keep original',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.commonFields.keepOriginalFieldHelpText"
        defaultMessage="Copy the unparsed URI to {field}."
        values={{
          field: <EuiCode>{'<target_field>.original'}</EuiCode>,
        }}
      />
    ),
  },
  remove_if_successful: {
    type: FIELD_TYPES.TOGGLE,
    defaultValue: false,
    deserializer: to.booleanOrUndef,
    serializer: from.undefinedIfValue(false),
    label: i18n.translate(
      'xpack.ingestPipelines.pipelineEditor.commonFields.removeIfSuccessfulFieldLabel',
      {
        defaultMessage: 'Remove if successful',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.pipelineEditor.commonFields.removeIfSuccessfulFieldHelpText"
        defaultMessage="Remove the field after parsing the URI string."
      />
    ),
  },
};

export const UriParts: FunctionComponent = () => {
  return (
    <>
      <FieldNameField
        helpText={i18n.translate(
          'xpack.ingestPipelines.pipelineEditor.uriPartsForm.fieldNameHelpText',
          { defaultMessage: 'Field containing URI string.' }
        )}
      />

      <TargetField />

      <UseField
        config={fieldsConfig.keep_original}
        component={ToggleField}
        path="fields.keep_original"
        data-test-subj="keepOriginalField"
      />

      <UseField
        config={fieldsConfig.remove_if_successful}
        component={ToggleField}
        path="fields.remove_if_successful"
        data-test-subj="removeIfSuccessfulField"
      />
    </>
  );
};

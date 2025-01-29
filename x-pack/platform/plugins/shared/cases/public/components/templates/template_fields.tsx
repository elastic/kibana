/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField, TextAreaField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { EuiFlexGroup } from '@elastic/eui';
import { OptionalFieldLabel } from '../optional_field_label';
import { TemplateTags } from './template_tags';

const TemplateFieldsComponent: React.FC<{
  isLoading: boolean;
  configurationTemplateTags: string[];
}> = ({ isLoading = false, configurationTemplateTags }) => (
  <EuiFlexGroup data-test-subj="template-fields" direction="column" gutterSize="none">
    <UseField
      path="name"
      component={TextField}
      componentProps={{
        euiFieldProps: {
          'data-test-subj': 'template-name-input',
          fullWidth: true,
          autoFocus: true,
          isLoading,
        },
      }}
    />
    <TemplateTags isLoading={isLoading} tagOptions={configurationTemplateTags} />
    <UseField
      path="templateDescription"
      component={TextAreaField}
      componentProps={{
        labelAppend: OptionalFieldLabel,
        euiFieldProps: {
          'data-test-subj': 'template-description-input',
          fullWidth: true,
          isLoading,
        },
      }}
    />
  </EuiFlexGroup>
);

TemplateFieldsComponent.displayName = 'TemplateFields';

export const TemplateFields = memo(TemplateFieldsComponent);

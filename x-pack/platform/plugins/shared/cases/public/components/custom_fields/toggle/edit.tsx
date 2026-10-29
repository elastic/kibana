/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Form, UseField, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import { ToggleField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText } from '@elastic/eui';
import type { CaseCustomFieldToggle } from '../../../../common/types/domain';
import { CustomFieldTypes } from '../../../../common/types/domain';
import type { CustomFieldType } from '../types';
import { View } from './view';
import { FieldValueRow } from '../../templates_v2/field_types/field_value_view';

const ClassicEdit: CustomFieldType<CaseCustomFieldToggle>['Edit'] = ({
  customField,
  customFieldConfiguration,
  onSubmit,
  isLoading,
  canUpdate,
}) => {
  const initialValue = Boolean(customField?.value);
  const title = customFieldConfiguration.label;

  const { form } = useForm<{ value: boolean }>({
    defaultValue: { value: initialValue },
  });

  const onSubmitCustomField = async () => {
    const { isValid, data } = await form.submit();

    if (isValid) {
      onSubmit({
        ...customField,
        key: customField?.key ?? customFieldConfiguration.key,
        type: CustomFieldTypes.TOGGLE,
        value: data.value,
      });
    }
  };

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="none"
        justifyContent="spaceBetween"
        responsive={false}
      >
        <EuiFlexItem grow={false}>
          <EuiText>
            <h4>{title}</h4>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiHorizontalRule margin="xs" />
      <EuiFlexGroup
        gutterSize="m"
        data-test-subj={`case-toggle-custom-field-${customFieldConfiguration.key}`}
        direction="column"
      >
        <Form form={form}>
          <UseField
            path="value"
            component={ToggleField}
            onChange={onSubmitCustomField}
            componentProps={{
              euiFieldProps: {
                disabled: isLoading || !canUpdate,
                'data-test-subj': `case-toggle-custom-field-form-field-${customFieldConfiguration.key}`,
              },
            }}
          />
        </Form>
      </EuiFlexGroup>
    </>
  );
};

ClassicEdit.displayName = 'ClassicEdit';

const InlineEdit: CustomFieldType<CaseCustomFieldToggle>['Edit'] = ({
  customField,
  customFieldConfiguration,
  onSubmit,
  isLoading,
  canUpdate,
}) => {
  const initialValue = Boolean(customField?.value);
  const title = customFieldConfiguration.label;

  const { form } = useForm<{ value: boolean }>({
    defaultValue: { value: initialValue },
  });

  const onSubmitCustomField = async () => {
    const { isValid, data } = await form.submit();

    if (isValid) {
      onSubmit({
        ...customField,
        key: customField?.key ?? customFieldConfiguration.key,
        type: CustomFieldTypes.TOGGLE,
        value: data.value,
      });
    }
  };

  return (
    <EuiFlexGroup
      gutterSize="m"
      data-test-subj={`case-toggle-custom-field-${customFieldConfiguration.key}`}
      direction="column"
    >
      <Form form={form}>
        <UseField
          path="value"
          component={ToggleField}
          label={title}
          onChange={onSubmitCustomField}
          componentProps={{
            euiFieldProps: {
              disabled: isLoading || !canUpdate,
              'data-test-subj': `case-toggle-custom-field-form-field-${customFieldConfiguration.key}`,
            },
          }}
        />
      </Form>
    </EuiFlexGroup>
  );
};

InlineEdit.displayName = 'InlineEdit';

/**
 * Section-edit mode's view state: a label/value row identical to the template fields section's
 * own (`FieldValueRow`), reusing this type's `View` for the value itself. Clicking anywhere on the
 * row asks the *section* to enter edit mode — every field in it switches to `InlineEdit` together,
 * there is no independent per-field edit state here.
 */
const InlineView: CustomFieldType<CaseCustomFieldToggle>['Edit'] = ({
  customField,
  customFieldConfiguration,
  isLoading,
  canUpdate,
  onRequestSectionEdit,
}) => (
  <FieldValueRow
    name={customFieldConfiguration.key}
    label={customFieldConfiguration.label}
    onEdit={!isLoading && canUpdate ? onRequestSectionEdit : undefined}
  >
    <View customField={customField} />
  </FieldValueRow>
);

InlineView.displayName = 'InlineView';

const EditComponent: CustomFieldType<CaseCustomFieldToggle>['Edit'] = ({
  editVariant = 'classic',
  isSectionEditing = true,
  onRequestSectionEdit,
  ...props
}) => {
  if (editVariant === 'inline') {
    return isSectionEditing ? (
      <InlineEdit {...props} />
    ) : (
      <InlineView {...props} onRequestSectionEdit={onRequestSectionEdit} />
    );
  }

  return <ClassicEdit {...props} />;
};

EditComponent.displayName = 'Edit';

export const Edit = React.memo(EditComponent);

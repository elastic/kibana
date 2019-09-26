/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  useForm,
  Form,
  UseField,
} from '../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { FormRow } from '../../../../../../../../src/plugins/es_ui_shared/static/forms/components';
import { templatesDocumentationLink } from '../../../lib/documentation_links';
import { StepProps } from '../types';
import { schemas } from '../template_form_schemas';

const i18n = {
  name: {
    title: (
      <FormattedMessage
        id="xpack.idxMgmt.templateForm.stepLogistics.nameTitle"
        defaultMessage="Name"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.idxMgmt.templateForm.stepLogistics.nameDescription"
        defaultMessage="A unique identifier for this template."
      />
    ),
  },
  indexPatterns: {
    title: (
      <FormattedMessage
        id="xpack.idxMgmt.templateForm.stepLogistics.indexPatternsTitle"
        defaultMessage="Index patterns"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.idxMgmt.templateForm.stepLogistics.indexPatternsDescription"
        defaultMessage="The index patterns to apply to the template."
      />
    ),
  },
  order: {
    title: (
      <FormattedMessage
        id="xpack.idxMgmt.templateForm.stepLogistics.orderTitle"
        defaultMessage="Merge order"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.idxMgmt.templateForm.stepLogistics.orderDescription"
        defaultMessage="The merge order when multiple templates match an index."
      />
    ),
  },
  version: {
    title: (
      <FormattedMessage
        id="xpack.idxMgmt.templateForm.stepLogistics.versionTitle"
        defaultMessage="Version"
      />
    ),
    description: (
      <FormattedMessage
        id="xpack.idxMgmt.templateForm.stepLogistics.versionDescription"
        defaultMessage="A number that identifies the template to external management systems."
      />
    ),
  },
};

export const StepLogistics: React.FunctionComponent<StepProps> = ({
  template,
  isEditing,
  setDataGetter,
  onStepValidityChange,
}) => {
  const { form } = useForm({
    schema: schemas.logistics,
    defaultValue: template,
    options: { stripEmptyFields: false },
  });

  useEffect(() => {
    onStepValidityChange(form.isValid);
  }, [form.isValid]);

  useEffect(() => {
    setDataGetter(form.submit);
  }, [form]);

  return (
    <Form form={form} data-test-subj="stepLogistics">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h3>
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepLogistics.stepTitle"
                defaultMessage="Logistics"
              />
            </h3>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={templatesDocumentationLink}
            target="_blank"
            iconType="help"
          >
            <FormattedMessage
              id="xpack.idxMgmt.templateForm.stepLogistics.docsButtonLabel"
              defaultMessage="Index Templates docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      {/* Name */}
      <UseField
        path="name"
        component={FormRow}
        componentProps={{
          title: i18n.name.title,
          titleTag: 'h3',
          description: i18n.name.description,
          idAria: 'stepLogisticsNameDescription',
          euiFieldProps: { disabled: isEditing },
          ['data-test-subj']: 'nameField',
        }}
      />
      {/* Index patterns */}
      <UseField
        path="indexPatterns"
        component={FormRow}
        componentProps={{
          title: i18n.indexPatterns.title,
          titleTag: 'h3',
          description: i18n.indexPatterns.description,
          idAria: 'stepLogisticsIndexPatternsDescription',
          ['data-test-subj']: 'indexPatternsField',
        }}
      />
      {/* Order */}
      <UseField
        path="order"
        component={FormRow}
        componentProps={{
          title: i18n.order.title,
          titleTag: 'h3',
          description: i18n.order.description,
          idAria: 'stepLogisticsOrderDescription',
          ['data-test-subj']: 'orderField',
        }}
      />
      {/* Version */}
      <UseField
        path="version"
        component={FormRow}
        componentProps={{
          title: i18n.version.title,
          titleTag: 'h3',
          description: i18n.version.description,
          idAria: 'stepLogisticsVersionDescription',
          euiFieldProps: { ['data-test-subj']: 'versionField' },
        }}
      />
    </Form>
  );
};

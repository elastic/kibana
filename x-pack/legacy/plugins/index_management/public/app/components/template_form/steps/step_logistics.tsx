/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  useForm,
  Form,
  getUseField,
} from '../../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import {
  getFormRow,
  Field,
} from '../../../../../../../../../src/plugins/es_ui_shared/static/forms/components';
import { documentationService } from '../../../services/documentation';
import { StepProps } from '../types';
import { schemas, nameConfig, nameConfigWithoutValidations } from '../template_form_schemas';

// Create or Form components with partial props that are common to all instances
const UseField = getUseField({ component: Field });
const FormRow = getFormRow({ titleTag: 'h3' });

const fieldsMeta = {
  name: {
    title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.nameTitle', {
      defaultMessage: 'Name',
    }),
    description: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.nameDescription', {
      defaultMessage: 'A unique identifier for this template.',
    }),
    testSubject: 'nameField',
  },
  indexPatterns: {
    title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.indexPatternsTitle', {
      defaultMessage: 'Index patterns',
    }),
    description: i18n.translate(
      'xpack.idxMgmt.templateForm.stepLogistics.indexPatternsDescription',
      {
        defaultMessage: 'The index patterns to apply to the template.',
      }
    ),
    testSubject: 'indexPatternsField',
  },
  order: {
    title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.orderTitle', {
      defaultMessage: 'Merge order',
    }),
    description: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.orderDescription', {
      defaultMessage: 'The merge order when multiple templates match an index.',
    }),
    testSubject: 'orderField',
  },
  version: {
    title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.versionTitle', {
      defaultMessage: 'Version',
    }),
    description: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.versionDescription', {
      defaultMessage: 'A number that identifies the template to external management systems.',
    }),
    testSubject: 'versionField',
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

  const { name, indexPatterns, order, version } = fieldsMeta;

  return (
    <Form form={form} data-test-subj="stepLogistics">
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2>
              <FormattedMessage
                id="xpack.idxMgmt.templateForm.stepLogistics.stepTitle"
                defaultMessage="Logistics"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            flush="right"
            href={documentationService.getTemplatesDocumentationLink()}
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
      <FormRow title={name.title} description={name.description}>
        <UseField
          path="name"
          componentProps={{
            ['data-test-subj']: name.testSubject,
            euiFieldProps: { disabled: isEditing },
          }}
          config={isEditing ? nameConfigWithoutValidations : nameConfig}
        />
      </FormRow>
      {/* Index patterns */}
      <FormRow title={indexPatterns.title} description={indexPatterns.description}>
        <UseField
          path="indexPatterns"
          componentProps={{
            ['data-test-subj']: indexPatterns.testSubject,
          }}
        />
      </FormRow>
      {/* Order */}
      <FormRow title={order.title} description={order.description}>
        <UseField
          path="order"
          componentProps={{
            ['data-test-subj']: order.testSubject,
          }}
        />
      </FormRow>
      {/* Version */}
      <FormRow title={version.title} description={version.description}>
        <UseField
          path="version"
          componentProps={{
            ['data-test-subj']: version.testSubject,
          }}
        />
      </FormRow>
    </Form>
  );
};

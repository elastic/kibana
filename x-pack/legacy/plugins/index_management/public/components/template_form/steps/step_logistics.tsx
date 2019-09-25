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
  UseField,
} from '../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { FormRow } from '../../../../../../../../src/plugins/es_ui_shared/static/forms/components';
import { templatesDocumentationLink } from '../../../lib/documentation_links';
import { StepProps } from '../types';
import { schemas } from '../template_form_schemas';

const fieldsMeta = {
  name: {
    title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.nameTitle', {
      defaultMessage: 'Name',
    }),
    description: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.nameDescription', {
      defaultMessage: 'A unique identifier for this template.',
    }),
    idAria: 'stepLogisticsNameDescription',
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
    idAria: 'stepLogisticsIndexPatternsDescription',
    testSubject: 'indexPatternsField',
  },
  order: {
    title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.orderTitle', {
      defaultMessage: 'Merge order',
    }),
    description: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.orderDescription', {
      defaultMessage: 'The merge order when multiple templates match an index.',
    }),
    idAria: 'stepLogisticsOrderDescription',
    testSubject: 'orderField',
  },
  version: {
    title: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.versionTitle', {
      defaultMessage: 'Version',
    }),
    description: i18n.translate('xpack.idxMgmt.templateForm.stepLogistics.versionDescription', {
      defaultMessage: 'A number that identifies the template to external management systems.',
    }),
    idAria: 'stepLogisticsVersionDescription',
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
      <FormRow title={name.title} description={name.description} titleTag="h3" idAria={name.idAria}>
        <UseField
          path="name"
          componentProps={{
            idAria: name.idAria,
            ['data-test-subj']: name.testSubject,
            euiFieldProps: { disabled: isEditing },
          }}
        />
      </FormRow>
      {/* Index patterns */}
      <FormRow
        title={indexPatterns.title}
        description={indexPatterns.description}
        titleTag="h3"
        idAria={indexPatterns.idAria}
      >
        <UseField
          path="indexPatterns"
          componentProps={{
            idAria: indexPatterns.idAria,
            ['data-test-subj']: indexPatterns.testSubject,
          }}
        />
      </FormRow>
      {/* Order */}
      <FormRow
        title={order.title}
        description={order.description}
        titleTag="h3"
        idAria={order.idAria}
      >
        <UseField
          path="order"
          componentProps={{
            idAria: order.idAria,
            ['data-test-subj']: order.testSubject,
          }}
        />
      </FormRow>
      {/* Version */}
      <FormRow
        title={version.title}
        description={version.description}
        titleTag="h3"
        idAria={version.idAria}
      >
        <UseField
          path="version"
          componentProps={{
            idAria: version.idAria,
            ['data-test-subj']: version.testSubject,
          }}
        />
      </FormRow>
    </Form>
  );
};

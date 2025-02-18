/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode, EuiLink } from '@elastic/eui';

import { DocumentationService } from '../../../../../services';
import {
  ComboBoxField,
  FIELD_TYPES,
  UseField,
  Field,
  fieldValidators,
  useFormData,
  useFormContext,
  useKibana,
} from '../../../../../../shared_imports';

import { FieldsConfig, to, from } from './shared';

const { maxLengthField } = fieldValidators;

const MAX_DATASET_LENGTH = 100;
const MAX_NAMESPACE_LENGTH = 100;

const getFieldsConfig = (docService: DocumentationService): FieldsConfig => {
  return {
    /* Optional field configs */
    destination: {
      type: FIELD_TYPES.TEXT,
      serializer: from.emptyStringToUndefined,
      label: i18n.translate('xpack.ingestPipelines.pipelineEditor.reroute.destinationFieldLabel', {
        defaultMessage: 'Destination (optional)',
      }),
      helpText: (
        <FormattedMessage
          id="xpack.ingestPipelines.pipelineEditor.reroute.destinationFieldHelperText"
          defaultMessage="A value for the target index. Not available when {dataset} or {namespace} is set."
          values={{
            dataset: <EuiCode>{'dataset'}</EuiCode>,
            namespace: <EuiCode>{'namespace'}</EuiCode>,
          }}
        />
      ),
    },
    dataset: {
      defaultValue: null,
      type: FIELD_TYPES.COMBO_BOX,
      deserializer: to.arrayOfStrings,
      serializer: from.optionalArrayOfStrings,
      label: i18n.translate('xpack.ingestPipelines.pipelineEditor.reroute.datasetFieldLabel', {
        defaultMessage: 'Dataset (optional)',
      }),
      helpText: (
        <FormattedMessage
          id="xpack.ingestPipelines.pipelineEditor.reroute.datasetFieldHelperText"
          defaultMessage="Field references or a static value for the dataset part of the data stream name. Must meet the criteria for {indexNamesLink}. Cannot contain {dash}. 100 characters max."
          values={{
            indexNamesLink: (
              <EuiLink
                href={`${docService.getEsDocsBasePath()}/indices-create-index.html#indices-create-api-path-params`}
                target="_blank"
                external
              >
                {i18n.translate('xpack.ingestPipelines.pipelineEditor.reroute.indexNameLink', {
                  defaultMessage: 'index names',
                })}
              </EuiLink>
            ),
            dash: <EuiCode>{'-'}</EuiCode>,
          }}
        />
      ),
      validations: [
        {
          validator: maxLengthField({
            length: MAX_DATASET_LENGTH,
            message: i18n.translate(
              'xpack.ingestPipelines.pipelineEditor.rerouteForm.datasetLengthError',
              {
                defaultMessage: 'The value must not contain more than 100 characters.',
              }
            ),
          }),
        },
      ],
    },
    namespace: {
      defaultValue: null,
      type: FIELD_TYPES.COMBO_BOX,
      deserializer: to.arrayOfStrings,
      serializer: from.optionalArrayOfStrings,
      label: i18n.translate('xpack.ingestPipelines.pipelineEditor.reroute.namespaceFieldLabel', {
        defaultMessage: 'Namespace (optional)',
      }),
      helpText: (
        <FormattedMessage
          id="xpack.ingestPipelines.pipelineEditor.reroute.namespaceFieldHelperText"
          defaultMessage="Field references or a static value for the namespace part of the data stream name. Must meet the criteria for {indexNamesLink}. 100 characters max."
          values={{
            indexNamesLink: (
              <EuiLink
                href={`${docService.getEsDocsBasePath()}/indices-create-index.html#indices-create-api-path-params`}
                target="_blank"
                external
              >
                {i18n.translate('xpack.ingestPipelines.pipelineEditor.reroute.indexNameLink', {
                  defaultMessage: 'index names',
                })}
              </EuiLink>
            ),
          }}
        />
      ),
      validations: [
        {
          validator: maxLengthField({
            length: MAX_NAMESPACE_LENGTH,
            message: i18n.translate(
              'xpack.ingestPipelines.pipelineEditor.rerouteForm.namespaceLengthError',
              {
                defaultMessage: 'The value must not contain more than 100 characters.',
              }
            ),
          }),
        },
      ],
    },
  };
};

export const Reroute: FunctionComponent = () => {
  const form = useFormContext();
  const [{ fields }] = useFormData({ watch: ['fields.dataset', 'fields.namespace'] });
  const { services } = useKibana();
  const fieldsConfig = getFieldsConfig(services.documentation);

  useEffect(() => {
    if (
      (fields?.dataset && fields.dataset.length > 0) ||
      (fields?.namespace && fields.namespace.length > 0)
    ) {
      form.setFieldValue('fields.destination', '');
    }
  }, [form, fields]);

  return (
    <>
      <UseField
        data-test-subj="destinationField"
        config={fieldsConfig.destination}
        component={Field}
        componentProps={{
          euiFieldProps: {
            disabled:
              (fields?.dataset && fields.dataset.length > 0) ||
              (fields?.namespace && fields.namespace.length > 0),
          },
        }}
        path="fields.destination"
      />

      <UseField
        data-test-subj="datasetField"
        config={fieldsConfig.dataset}
        component={ComboBoxField}
        componentProps={{
          euiFieldProps: {
            placeholder: '{{data_stream.dataset}}',
          },
        }}
        path="fields.dataset"
      />

      <UseField
        data-test-subj="namespaceField"
        config={fieldsConfig.namespace}
        component={ComboBoxField}
        componentProps={{
          euiFieldProps: {
            placeholder: '{{data_stream.namespace}}',
          },
        }}
        path="fields.namespace"
      />
    </>
  );
};

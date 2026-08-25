/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { debounce } from 'lodash';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow, EuiSpacer, EuiComboBox, EuiTitle, EuiIconTip, EuiLink } from '@elastic/eui';
import type { FieldConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  getFieldValidityAndErrorMessage,
  UseField,
  useFormContext,
  useFormData,
  VALIDATION_TYPES,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import {
  ToggleField,
  SelectField,
  HiddenField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import type { DocLinksStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { type ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  firstFieldOption,
  getFields,
  getIndexOptions,
  getTimeFieldOptions,
  useKibana,
} from '@kbn/triggers-actions-ui-plugin/public';
import * as translations from './translations';
import { indexNameValidator } from './validation';

interface TimeFieldOptions {
  value: string;
  text: string;
}

const { indexPatternField, emptyField } = fieldValidators;

const getIndexConfig = (docLinks: DocLinksStart): FieldConfig => ({
  label: translations.INDEX_LABEL,
  helpText: (
    <>
      <EuiLink href={docLinks.links.alerting.indexAction} target="_blank">
        <FormattedMessage
          id="xpack.stackConnectors.components.index.configureIndexHelpLabel"
          defaultMessage="Configuring index connector."
        />
      </EuiLink>
    </>
  ),
  validations: [
    {
      validator: emptyField(translations.INDEX_IS_NOT_VALID),
    },
    {
      validator: indexPatternField(i18n),
    },
    {
      validator: indexNameValidator(),
    },
  ],
});

const IndexActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const { http, docLinks } = useKibana().services;
  const { getFieldDefaultValue } = useFormContext();
  const [{ config, __internal__ }] = useFormData({
    watch: ['config.executionTimeField', 'config.index', '__internal__.hasTimeFieldCheckbox'],
  });

  const { index = null } = config ?? {};

  const [indexOptions, setIndexOptions] = useState<EuiComboBoxOptionOption[]>([]);
  const [timeFieldOptions, setTimeFieldOptions] = useState<TimeFieldOptions[]>([]);
  const [areIndiciesLoading, setAreIndicesLoading] = useState<boolean>(false);

  const hasTimeFieldCheckboxDefaultValue = !!getFieldDefaultValue<string | undefined>(
    'config.executionTimeField'
  );
  const showTimeFieldCheckbox = index != null && timeFieldOptions.length > 0;
  const showTimeFieldSelect = __internal__ != null ? __internal__.hasTimeFieldCheckbox : false;

  const setTimeFields = (fields: TimeFieldOptions[]) => {
    if (fields.length > 0) {
      setTimeFieldOptions([firstFieldOption, ...fields]);
    } else {
      setTimeFieldOptions([]);
    }
  };

  const loadIndexOptions = debounce(async (search: string) => {
    setAreIndicesLoading(true);
    setIndexOptions(await getIndexOptions(http!, search));
    setAreIndicesLoading(false);
  }, 250);

  useEffect(() => {
    const indexPatternsFunction = async () => {
      if (index) {
        const currentEsFields = await getFields(http!, [index]);
        if (Array.isArray(currentEsFields)) {
          setTimeFields(getTimeFieldOptions(currentEsFields as any));
        }
      }
    };
    indexPatternsFunction();
  }, [http, index]);

  return (
    <>
      <EuiTitle size="s">
        <h5>
          <FormattedMessage
            defaultMessage="Write to index"
            id="xpack.stackConnectors.components.index.connectorSectionTitle"
          />
        </h5>
      </EuiTitle>
      <UseField path="config.refresh" component={HiddenField} />
      <EuiSpacer size="m" />
      <UseField path="config.index" config={getIndexConfig(docLinks)}>
        {(field) => {
          const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

          const onComboChange = async (options: EuiComboBoxOptionOption[]) => {
            field.setValue(options.length > 0 ? options[0].value : '');
            const indices = options.map((s) => s.value as string);

            // reset time field and expression fields if indices are deleted
            if (indices.length === 0) {
              setTimeFields([]);
              return;
            }
            const currentEsFields = await getFields(http!, indices);
            setTimeFields(getTimeFieldOptions(currentEsFields as any));
          };

          const onSearchComboChange = (value: string) => {
            if (value !== undefined) {
              field.clearErrors(VALIDATION_TYPES.ARRAY_ITEM);
            }

            loadIndexOptions(value);
          };

          return (
            <EuiFormRow
              id="indexConnectorSelectSearchBox"
              fullWidth
              label={
                <FormattedMessage
                  id="xpack.stackConnectors.components.index.indicesToQueryLabel"
                  defaultMessage="Index"
                />
              }
              isInvalid={isInvalid}
              error={errorMessage}
              helpText={
                <>
                  <EuiLink href={docLinks.links.alerting.indexAction} target="_blank">
                    <FormattedMessage
                      id="xpack.stackConnectors.components.index.configureIndexHelpLabel"
                      defaultMessage="Configuring index connector."
                    />
                  </EuiLink>
                </>
              }
            >
              <EuiComboBox
                fullWidth
                singleSelection={{ asPlainText: true }}
                async
                isLoading={areIndiciesLoading}
                isInvalid={isInvalid}
                noSuggestions={!indexOptions.length}
                options={indexOptions}
                data-test-subj="connectorIndexesComboBox"
                data-testid="connectorIndexesComboBox"
                placeholder={translations.INDEX_NAME_PLACEHOLDER}
                selectedOptions={
                  index
                    ? [
                        {
                          value: index,
                          label: index,
                        },
                      ]
                    : []
                }
                isDisabled={readOnly}
                onChange={onComboChange}
                onSearchChange={onSearchComboChange}
              />
            </EuiFormRow>
          );
        }}
      </UseField>
      <EuiSpacer size="m" />
      {showTimeFieldCheckbox ? (
        <UseField
          path="__internal__.hasTimeFieldCheckbox"
          component={ToggleField}
          config={{ defaultValue: hasTimeFieldCheckboxDefaultValue }}
          componentProps={{
            euiFieldProps: {
              label: (
                <>
                  <FormattedMessage
                    id="xpack.stackConnectors.components.index.defineTimeFieldLabel"
                    defaultMessage="Define time field for each document"
                  />
                  <EuiIconTip
                    position="right"
                    type="question"
                    content={translations.SHOW_TIME_FIELD_TOGGLE_TOOLTIP}
                  />
                </>
              ),
              disabled: readOnly,
              'data-test-subj': 'hasTimeFieldCheckbox',
            },
          }}
        />
      ) : null}
      {showTimeFieldSelect ? (
        <>
          <EuiSpacer size="m" />
          <UseField
            path="config.executionTimeField"
            component={SelectField}
            config={{
              label: translations.EXECUTION_TIME_LABEL,
            }}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'executionTimeFieldSelect',
                options: timeFieldOptions,
                fullWidth: true,
                readOnly,
              },
            }}
          />
        </>
      ) : null}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { IndexActionConnectorFields as default };

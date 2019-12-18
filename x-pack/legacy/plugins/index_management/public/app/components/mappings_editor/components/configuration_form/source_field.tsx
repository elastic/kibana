/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink, EuiSpacer, EuiCallOut } from '@elastic/eui';

import { documentationService } from '../../../../services/documentation';
import {
  UseField,
  FormDataProvider,
  FormRow,
  ToggleField,
  ComboBoxField,
  FieldHook,
  VALIDATION_TYPES,
  FieldValidateResponse,
} from '../../shared_imports';
import { ComboBoxOption } from '../../types';

const i18nTexts = {
  sourceField: {
    title: i18n.translate('xpack.idxMgmt.mappingsEditor.sourceFieldTitle', {
      defaultMessage: '_source field',
    }),
    description: (
      <FormattedMessage
        id="xpack.idxMgmt.mappingsEditor.sourceFieldDescription"
        defaultMessage="The _source field contains the original JSON document body that was provided at index time. Individual fields can be pruned by defining which ones to include or exclude from the _source field. {docsLink}"
        values={{
          docsLink: (
            <EuiLink href={documentationService.getMappingSourceFieldLink()} target="_blank">
              {i18n.translate('xpack.idxMgmt.mappingsEditor.sourceFieldDocumentionLink', {
                defaultMessage: 'Learn more.',
              })}
            </EuiLink>
          ),
        }}
      />
    ),
  },
  comboBox: {
    placeholder: i18n.translate(
      'xpack.idxMgmt.mappingsEditor.sourceIncludeField.placeholderLabel',
      {
        defaultMessage: 'path.to.field.*',
      }
    ),
  },
};

const ComboBoxFields = ({ field }: { field: FieldHook }) => {
  const [options, setOptions] = useState<ComboBoxOption[]>([]);
  const { setValue } = field;

  return (
    <ComboBoxField
      field={field}
      euiFieldProps={{
        placeholder: i18nTexts.comboBox.placeholder,
        noSuggestions: false,
        options,
        onCreateOption: (searchValue: string) => {
          const { isValid } = field.validate({
            value: searchValue,
            validationType: VALIDATION_TYPES.ARRAY_ITEM,
          }) as FieldValidateResponse;

          if (!isValid) {
            // Return false to explicitly reject the user's input.
            return false;
          }

          setValue([...(field.value as ComboBoxOption[]), searchValue]);

          setOptions([
            ...options,
            {
              label: searchValue,
            },
          ]);
        },
      }}
    />
  );
};

export const SourceField = () => {
  const renderWarning = () => (
    <EuiCallOut
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.disabledSourceFieldCallOutTitle', {
        defaultMessage: 'Use caution when disabling the _source field',
      })}
      iconType="alert"
      color="warning"
    >
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.disabledSourceFieldCallOutDescription1"
          defaultMessage="Disabling {source} lowers storage overhead within the index, but this comes at a cost. It also disables important features, such as the ability to reindex or debug queries by viewing the original document."
          values={{
            source: (
              <code>
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.disabledSourceFieldCallOutDescription1.sourceText',
                  {
                    defaultMessage: '_source',
                  }
                )}
              </code>
            ),
          }}
        />
      </p>

      <p>
        <a href={documentationService.getDisablingMappingSourceFieldLink()} target="_blank">
          <FormattedMessage
            id="xpack.idxMgmt.mappingsEditor.disabledSourceFieldCallOutDescription2"
            defaultMessage="Learn more about alternatives to disabling the {source} field."
            values={{
              source: (
                <code>
                  {i18n.translate(
                    'xpack.idxMgmt.mappingsEditor.disabledSourceFieldCallOutDescription2.sourceText',
                    {
                      defaultMessage: '_source',
                    }
                  )}
                </code>
              ),
            }}
          />
        </a>
      </p>
    </EuiCallOut>
  );

  return (
    <FormRow
      title={i18nTexts.sourceField.title}
      description={
        <>
          {i18nTexts.sourceField.description}
          <EuiSpacer size="m" />
          <UseField path="_source.enabled" component={ToggleField} />
        </>
      }
    >
      <FormDataProvider pathsToWatch="_source.enabled">
        {formData => {
          if (formData['_source.enabled']) {
            return (
              <>
                <UseField path="_source.includes" component={ComboBoxFields} />
                <EuiSpacer size="m" />
                <UseField path="_source.excludes" component={ComboBoxFields} />
              </>
            );
          }

          return renderWarning();
        }}
      </FormDataProvider>
    </FormRow>
  );
};

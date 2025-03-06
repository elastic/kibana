/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiSpacer, EuiComboBox, EuiFormRow, EuiCallOut, EuiText } from '@elastic/eui';

import { useAppContext } from '../../../../../app_context';
import { documentationService } from '../../../../../services/documentation';
import { UseField, FormDataProvider, FormRow, SuperSelectField } from '../../../shared_imports';
import { ComboBoxOption } from '../../../types';
import { sourceOptionLabels, sourceOptionDescriptions } from './i18n_texts';
import {
  STORED_SOURCE_OPTION,
  DISABLED_SOURCE_OPTION,
  SYNTHETIC_SOURCE_OPTION,
  SourceOptionKey,
} from './constants';

export const SourceFieldSection = () => {
  const { canUseSyntheticSource } = useAppContext();

  const renderOptionDropdownDisplay = (option: SourceOptionKey) => (
    <Fragment>
      <strong>{sourceOptionLabels[option]}</strong>
      <EuiText size="s" color="subdued">
        <p>{sourceOptionDescriptions[option]}</p>
      </EuiText>
    </Fragment>
  );

  const sourceValueOptions = [
    {
      value: STORED_SOURCE_OPTION,
      inputDisplay: sourceOptionLabels[STORED_SOURCE_OPTION],
      dropdownDisplay: renderOptionDropdownDisplay(STORED_SOURCE_OPTION),
      'data-test-subj': 'storedSourceFieldOption',
    },
  ];

  if (canUseSyntheticSource) {
    sourceValueOptions.push({
      value: SYNTHETIC_SOURCE_OPTION,
      inputDisplay: sourceOptionLabels[SYNTHETIC_SOURCE_OPTION],
      dropdownDisplay: renderOptionDropdownDisplay(SYNTHETIC_SOURCE_OPTION),
      'data-test-subj': 'syntheticSourceFieldOption',
    });
  }
  sourceValueOptions.push({
    value: DISABLED_SOURCE_OPTION,
    inputDisplay: sourceOptionLabels[DISABLED_SOURCE_OPTION],
    dropdownDisplay: renderOptionDropdownDisplay(DISABLED_SOURCE_OPTION),
    'data-test-subj': 'disabledSourceFieldOption',
  });

  const renderDisableWarning = () => (
    <EuiCallOut
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.disabledSourceFieldCallOutTitle', {
        defaultMessage: 'Use caution when disabling the _source field',
      })}
      iconType="warning"
      color="warning"
    >
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.disabledSourceFieldCallOutDescription1"
          defaultMessage="Disabling {source} is not recommended. If storage overhead is a concern, consider using synthetic {source} instead. Disabling {source} will disable important features, such as the ability to reindex or debug queries by viewing the original document."
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
        <a
          href={documentationService.getMappingSyntheticSourceFieldLink()}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FormattedMessage
            id="xpack.idxMgmt.mappingsEditor.disabledSourceFieldCallOutDescription2"
            defaultMessage="Learn more about synthetic {source}."
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

  const renderSyntheticWarning = () => (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.disabledSourceFieldCallOutDescription2"
          defaultMessage="Synthetic {source} has been set by the selected index mode. Changing this setting will reduce the optimization provided by the index mode. {learnMoreLink}"
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
            learnMoreLink: (
              <EuiLink
                href={documentationService.getMappingSyntheticSourceFieldLink()}
                target="_blank"
              >
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.disabledSourceFieldCallOutDescription2.sourceText',
                  {
                    defaultMessage: 'Learn more.',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      }
      iconType="warning"
      color="warning"
    />
  );

  const renderFormFields = () => (
    <div data-test-subj="sourceField">
      <UseField path="sourceField.includes">
        {({ label, helpText, value, setValue }) => (
          <EuiFormRow label={label} helpText={helpText} fullWidth>
            <EuiComboBox
              noSuggestions
              placeholder={i18n.translate(
                'xpack.idxMgmt.mappingsEditor.sourceIncludeField.placeholderLabel',
                {
                  defaultMessage: 'path.to.field.*',
                }
              )}
              selectedOptions={value as ComboBoxOption[]}
              onChange={(newValue) => {
                setValue(newValue);
              }}
              onCreateOption={(searchValue: string) => {
                const newOption = {
                  label: searchValue,
                };

                setValue([...(value as ComboBoxOption[]), newOption]);
              }}
              fullWidth
              data-test-subj="includesField"
            />
          </EuiFormRow>
        )}
      </UseField>

      <EuiSpacer size="m" />

      <UseField path="sourceField.excludes">
        {({ label, helpText, value, setValue }) => (
          <EuiFormRow label={label} helpText={helpText} fullWidth>
            <EuiComboBox
              noSuggestions
              placeholder={i18n.translate(
                'xpack.idxMgmt.mappingsEditor.sourceExcludeField.placeholderLabel',
                {
                  defaultMessage: 'path.to.field.*',
                }
              )}
              selectedOptions={value as ComboBoxOption[]}
              onChange={(newValue) => {
                setValue(newValue);
              }}
              onCreateOption={(searchValue: string) => {
                const newOption = {
                  label: searchValue,
                };

                setValue([...(value as ComboBoxOption[]), newOption]);
              }}
              fullWidth
              data-test-subj="excludesField"
            />
          </EuiFormRow>
        )}
      </UseField>
    </div>
  );

  return (
    <FormRow
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.sourceFieldTitle', {
        defaultMessage: '_source field',
      })}
      description={
        <>
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
          <EuiSpacer size="m" />
          <UseField
            path="sourceField.option"
            component={SuperSelectField}
            componentProps={{
              euiFieldProps: {
                fullWidth: false,
                hasDividers: true,
                'data-test-subj': 'sourceValueField',
                options: sourceValueOptions,
              },
            }}
          />
        </>
      }
    >
      <FormDataProvider pathsToWatch={['sourceField.option']}>
        {(formData) => {
          const { sourceField } = formData;

          if (sourceField?.option === undefined) {
            return null;
          }

          return sourceField?.option === STORED_SOURCE_OPTION
            ? renderFormFields()
            : sourceField?.option === DISABLED_SOURCE_OPTION
            ? renderDisableWarning()
            : renderSyntheticWarning();
        }}
      </FormDataProvider>
    </FormRow>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiButton,
  EuiCallOut,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UrlTemplate } from '../../types';
import { LegacyIcon } from './legacy_icon';
import { getOutlinkEncoders } from '../../services/outlink_encoders';
import { drillDownIconChoices } from '../../services/style_choices';
import { isUrlTemplateValid, isKibanaUrl, replaceKibanaUrlParam } from '../../services/drilldown';

const encoders = getOutlinkEncoders();

export interface DrilldownFormProps {
  initialTemplate: UrlTemplate;
  onSubmit: (template: UrlTemplate) => void;
}

export function DrilldownForm({ initialTemplate, onSubmit }: DrilldownFormProps) {
  const [currentTemplate, setCurrentTemplate] = useState(initialTemplate);

  function setValue<K extends keyof UrlTemplate>(key: K, value: UrlTemplate[K]) {
    setCurrentTemplate({ ...currentTemplate, [key]: value });
  }

  const [touched, setTouched] = useState({
    description: false,
    url: false,
  });

  const [autoformatUrl, setAutoformatUrl] = useState(false);

  const urlPlaceholderMissing = Boolean(
    initialTemplate.url && !isUrlTemplateValid(initialTemplate.url)
  );
  const formIncomplete = !Boolean(initialTemplate.description && initialTemplate.url);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit(currentTemplate);
      }}
    >
      <EuiFormRow
        label={i18n.translate('xpack.graph.settings.drillDowns.urlDescriptionInputLabel', {
          defaultMessage: 'Title',
        })}
        isInvalid={touched.description && !currentTemplate.description}
        onBlur={() => setTouched({ ...touched, description: true })}
      >
        <EuiFieldText
          value={currentTemplate.description}
          isInvalid={touched.description && !currentTemplate.description}
          onChange={e => setValue('description', e.target.value)}
          placeholder={i18n.translate(
            'xpack.graph.settings.drillDowns.urlDescriptionInputPlaceholder',
            { defaultMessage: 'Search on Google' }
          )}
        />
      </EuiFormRow>
      <EuiForm>
        <EuiFormRow
          label={i18n.translate('xpack.graph.settings.drillDowns.urlInputLabel', {
            defaultMessage: 'URL',
          })}
          helpText={i18n.translate('xpack.graph.settings.drillDowns.urlInputHelpText', {
            defaultMessage:
              'Define template URLs using {gquery} where the selected vertex terms are inserted',
            values: { gquery: '{{gquery}}' },
          })}
          onBlur={() => setTouched({ ...touched, url: true })}
          isInvalid={urlPlaceholderMissing || (touched.url && !currentTemplate.url)}
          error={
            urlPlaceholderMissing
              ? [
                  i18n.translate('xpack.graph.settings.drillDowns.invalidUrlWarningText', {
                    defaultMessage: 'The URL must contain a {placeholder} string',
                    values: { placeholder: '{{gquery}}' },
                  }),
                ]
              : []
          }
        >
          <EuiFieldText
            placeholder="https://www.google.co.uk/#q={{gquery}}"
            value={currentTemplate.url}
            onChange={e => {
              setValue('url', e.target.value);
              setAutoformatUrl(false);
            }}
            onPaste={e => {
              e.preventDefault();
              const pastedUrl = e.clipboardData.getData('text/plain');
              if (isKibanaUrl(pastedUrl)) {
                setAutoformatUrl(true);
              }
              setValue('url', pastedUrl);
            }}
            isInvalid={urlPlaceholderMissing || (touched.url && !currentTemplate.url)}
          />
        </EuiFormRow>
        {autoformatUrl && (
          <>
            <EuiCallOut
              size="s"
              title={i18n.translate('xpack.graph.settings.drillDowns.kibanaUrlWarningTooltip', {
                defaultMessage: 'Kibana URL pasted',
              })}
            >
              <p>
                {i18n.translate('xpack.graph.settings.drillDowns.kibanaUrlWarningText', {
                  defaultMessage:
                    'This looks like a Kibana URL. Would you like us to convert it to a template for you?',
                })}
              </p>
              <EuiButton
                size="s"
                onClick={() => {
                  setValue('url', replaceKibanaUrlParam(currentTemplate.url));
                  setAutoformatUrl(false);
                }}
              >
                {i18n.translate(
                  'xpack.graph.settings.drillDowns.kibanaUrlWarningConvertOptionLinkText',
                  { defaultMessage: 'Convert' }
                )}
              </EuiButton>
            </EuiCallOut>
            <EuiSpacer />
          </>
        )}
      </EuiForm>
      <EuiFormRow
        helpText={currentTemplate.encoder.description}
        label={i18n.translate('xpack.graph.settings.drillDowns.urlEncoderInputLabel', {
          defaultMessage: 'URL parameter type',
        })}
      >
        <EuiComboBox
          singleSelection={{ asPlainText: true }}
          isClearable={false}
          options={encoders.map(encoder => ({ label: encoder.title, value: encoder }))}
          selectedOptions={[
            {
              label: currentTemplate.encoder.title,
              value: currentTemplate.encoder,
            },
          ]}
          onChange={choices => {
            // choices[0].value can't be null because `isClearable` is set to false above
            setValue('encoder', choices[0].value!);
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate('xpack.graph.settings.drillDowns.toolbarIconPickerLabel', {
          defaultMessage: 'Toolbar icon',
        })}
      >
        <div>
          {drillDownIconChoices.map(icon => (
            <LegacyIcon
              key={icon.class}
              asListIcon
              selected={icon === currentTemplate.icon}
              icon={icon}
              onClick={() => {
                setValue('icon', icon);
              }}
            />
          ))}
        </div>
      </EuiFormRow>
      <EuiButton type="submit" fill isDisabled={urlPlaceholderMissing || formIncomplete}>
        {i18n.translate('xpack.graph.settings.drillDowns.saveButtonLabel', {
          defaultMessage: 'Save',
        })}
      </EuiButton>
    </form>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UrlTemplate } from '../../types';
import { LegacyIcon } from './legacy_icon';
import { getOutlinkEncoders } from '../../services/outlink_encoders';
import { drillDownIconChoices } from '../../services/style_choices';
import { isUrlTemplateValid, isKibanaUrl, replaceKibanaUrlParam } from '../../services/drilldown';

const encoders = getOutlinkEncoders();

export interface DrilldownFormProps {
  template: UrlTemplate;
  setValue: <K extends keyof UrlTemplate>(key: K, value: UrlTemplate[K]) => void;
  onSubmit: () => void;
  onGoBack: () => void;
}

export function DrilldownForm({ template, setValue, onSubmit, onGoBack }: DrilldownFormProps) {
  const [touched, setTouched] = useState({
    description: false,
    url: false,
  });

  const [autoformatUrl, setAutoformatUrl] = useState(false);

  const urlPlaceholderMissing = Boolean(template.url && !isUrlTemplateValid(template.url));
  const formIncomplete = !Boolean(template.description && template.url);

  return (
    <>
      <EuiButtonEmpty iconType="arrowLeft" onClick={onGoBack}>
        {i18n.translate('xpack.graph.templates.backLabel', {
          defaultMessage: 'Go back to template list',
        })}
      </EuiButtonEmpty>
      <form
        onSubmit={e => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.graph.settings.drillDowns.urlDescriptionInputLabel', {
            defaultMessage: 'Title',
          })}
          isInvalid={touched.description && !template.description}
          onBlur={() => setTouched({ ...touched, description: true })}
        >
          <EuiFieldText
            fullWidth
            value={template.description}
            isInvalid={touched.description && !template.description}
            onChange={e => setValue('description', e.target.value)}
          />
        </EuiFormRow>
        <EuiForm>
          <EuiFormRow
            fullWidth
            label={i18n.translate('xpack.graph.settings.drillDowns.urlInputLabel', {
              defaultMessage: 'URL',
            })}
            helpText={i18n.translate('xpack.graph.settings.drillDowns.urlInputHelpText', {
              defaultMessage:
                'Define template URLs using {gquery} where the selected vertex terms are inserted',
              values: { gquery: '{{gquery}}' },
            })}
            onBlur={() => setTouched({ ...touched, url: true })}
            isInvalid={urlPlaceholderMissing || (touched.url && !template.url)}
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
              fullWidth
              placeholder="https://www.google.co.uk/#q={{gquery}}"
              value={template.url}
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
              isInvalid={urlPlaceholderMissing || (touched.url && !template.url)}
            />
          </EuiFormRow>
          {autoformatUrl && (
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
                  setValue('url', replaceKibanaUrlParam(template.url));
                  setAutoformatUrl(false);
                }}
              >
                {i18n.translate(
                  'xpack.graph.settings.drillDowns.kibanaUrlWarningConvertOptionLinkText',
                  { defaultMessage: 'Convert' }
                )}
              </EuiButton>
            </EuiCallOut>
          )}
        </EuiForm>
        <EuiFormRow
          fullWidth
          helpText={template.encoder.description}
          label={i18n.translate('xpack.graph.settings.drillDowns.urlEncoderInputLabel', {
            defaultMessage: 'URL parameter type',
          })}
        >
          <EuiComboBox
            fullWidth
            singleSelection={{ asPlainText: true }}
            isClearable={false}
            options={encoders.map(encoder => ({ label: encoder.title, value: encoder }))}
            selectedOptions={[
              {
                label: template.encoder.title,
                value: template.encoder,
              },
            ]}
            onChange={choices => {
              // choices[0].value can't be null because `isClearable` is set to false above
              setValue('encoder', choices[0].value!);
            }}
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.graph.settings.drillDowns.toolbarIconPickerLabel', {
            defaultMessage: 'Toolbar icon',
          })}
        >
          <div>
            {drillDownIconChoices.map(icon => (
              <LegacyIcon
                key={icon.class}
                asListIcon
                selected={icon === template.icon}
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
    </>
  );
}

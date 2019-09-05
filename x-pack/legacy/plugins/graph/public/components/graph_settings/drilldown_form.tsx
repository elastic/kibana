/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiComboBox,
  EuiButton,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UrlTemplate } from '../../types';
import { LegacyIcon } from './legacy_icon';
import { getOutlinkEncoders } from '../../services/outlink_encoders';
import { drillDownIconChoices } from '../../services/style_choices';
import { isUrlTemplateValid, isKibanaUrl, replaceKibanaUrlParam } from '../../services/drilldown';

const encoders = getOutlinkEncoders();

export interface NewFormProps {
  onSubmit: (template: UrlTemplate) => void;
}

export interface UpdateFormProps {
  onSubmit: (template: UrlTemplate) => void;
  initialTemplate: UrlTemplate;
  onRemove: () => void;
}

export type DrilldownFormProps = NewFormProps | UpdateFormProps;

function isUpdateForm(props: DrilldownFormProps): props is UpdateFormProps {
  return 'initialTemplate' in props;
}

export function DrilldownForm(props: DrilldownFormProps) {
  const { onSubmit } = props;
  const getInitialTemplate = () =>
    isUpdateForm(props)
      ? props.initialTemplate
      : {
          encoder: encoders[0],
          icon: null,
          description: '',
          url: '',
        };

  const [currentTemplate, setCurrentTemplate] = useState(getInitialTemplate);

  // reset local form if template passed in from parent component changes
  useEffect(() => {
    if (isUpdateForm(props) && currentTemplate !== props.initialTemplate) {
      setCurrentTemplate(props.initialTemplate);
    }
  }, [isUpdateForm(props) && props.initialTemplate]);

  const [touched, setTouched] = useState({
    description: false,
    url: false,
  });

  const [autoformatUrl, setAutoformatUrl] = useState(false);

  function setValue<K extends keyof UrlTemplate>(key: K, value: UrlTemplate[K]) {
    setCurrentTemplate({ ...currentTemplate, [key]: value });
  }

  function reset() {
    setTouched({
      description: false,
      url: false,
    });
    setCurrentTemplate(getInitialTemplate());
    setAutoformatUrl(false);
  }

  function convertUrl() {
    setCurrentTemplate({
      ...currentTemplate,
      url: replaceKibanaUrlParam(currentTemplate.url),
      // reset to kql encoder
      encoder:
        currentTemplate.encoder.type === 'kql'
          ? currentTemplate.encoder
          : encoders.find(enc => enc.type === 'kql')!,
    });
    setAutoformatUrl(false);
  }

  const urlPlaceholderMissing = Boolean(
    currentTemplate.url && !isUrlTemplateValid(currentTemplate.url)
  );
  const formIncomplete = !Boolean(currentTemplate.description && currentTemplate.url);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit(currentTemplate);
        if (!isUpdateForm(props)) {
          reset();
        }
      }}
    >
      <EuiSpacer size="s" />
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.graph.settings.drillDowns.urlDescriptionInputLabel', {
          defaultMessage: 'Title',
        })}
        isInvalid={touched.description && !currentTemplate.description}
        onBlur={() => setTouched({ ...touched, description: true })}
      >
        <EuiFieldText
          fullWidth
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
          fullWidth
          label={i18n.translate('xpack.graph.settings.drillDowns.urlInputLabel', {
            defaultMessage: 'URL',
          })}
          helpText={
            <>
              {autoformatUrl && (
                <strong>
                  {i18n.translate('xpack.graph.settings.drillDowns.kibanaUrlWarningTooltip', {
                    defaultMessage: 'Possible Kibana URL pasted, ',
                  })}
                  <button className="gphSettings__helpTextButton" onClick={convertUrl}>
                    {i18n.translate(
                      'xpack.graph.settings.drillDowns.kibanaUrlWarningConvertOptionLinkText',
                      { defaultMessage: 'convert it' }
                    )}
                  </button>
                  <br />
                </strong>
              )}
              {i18n.translate('xpack.graph.settings.drillDowns.urlInputHelpText', {
                defaultMessage:
                  'Define template URLs using {gquery} where the selected vertex terms are inserted',
                values: { gquery: '{{gquery}}' },
              })}
            </>
          }
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
            fullWidth
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
      </EuiForm>
      <EuiFormRow
        fullWidth
        helpText={currentTemplate.encoder.description}
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
              selected={icon === currentTemplate.icon}
              icon={icon}
              onClick={() => {
                setValue('icon', icon);
              }}
            />
          ))}
        </div>
      </EuiFormRow>
      <EuiFlexGroup justifyContent="flexEnd">
        {isUpdateForm(props) && (
          <>
            <EuiFlexItem grow={null}>
              {
                <EuiButtonEmpty
                  color="danger"
                  onClick={() => {
                    props.onRemove();
                  }}
                >
                  {i18n.translate('xpack.graph.settings.drillDowns.removeButtonLabel', {
                    defaultMessage: 'Remove',
                  })}
                </EuiButtonEmpty>
              }
            </EuiFlexItem>
            <EuiFlexItem></EuiFlexItem>
          </>
        )}
        <EuiFlexItem grow={null}>
          {
            <EuiButtonEmpty onClick={reset}>
              {i18n.translate('xpack.graph.settings.drillDowns.resetButtonLabel', {
                defaultMessage: 'Reset',
              })}
            </EuiButtonEmpty>
          }
        </EuiFlexItem>
        <EuiFlexItem grow={null}>
          <EuiButton type="submit" fill isDisabled={urlPlaceholderMissing || formIncomplete}>
            {isUpdateForm(props)
              ? i18n.translate('xpack.graph.settings.drillDowns.updateSaveButtonLabel', {
                  defaultMessage: 'Update template',
                })
              : i18n.translate('xpack.graph.settings.drillDowns.newSaveButtonLabel', {
                  defaultMessage: 'Add template',
                })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </form>
  );
}

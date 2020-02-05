/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiFieldText, EuiFormRow, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  label: string;
  setLabel: (label: string) => void;
  url: string;
  setURL: (url: string) => void;
}

export const SettingsSection = ({ label, setLabel, url, setURL }: Props) => {
  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate(
            'xpack.apm.settings.customizeUI.customAction.flyout.settingsSection.title',
            { defaultMessage: 'Action' }
          )}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.translate(
          'xpack.apm.settings.customizeUI.customAction.flyout.settingsSection.label',
          { defaultMessage: 'Label' }
        )}
        helpText={i18n.translate(
          'xpack.apm.settings.customizeUI.customAction.flyout.settingsSection.label.helpText',
          { defaultMessage: 'Labels can be max. 128 characters.' }
        )}
      >
        <EuiFieldText
          placeholder={i18n.translate(
            'xpack.apm.settings.customizeUI.customAction.flyout.settingsSection.label.placeHolder',
            { defaultMessage: 'i.e. Support tickets' }
          )}
          value={label}
          onChange={e => {
            setLabel(e.target.value);
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.translate(
          'xpack.apm.settings.customizeUI.customAction.flyout.settingsSection.url',
          { defaultMessage: 'URL' }
        )}
        helpText={i18n.translate(
          'xpack.apm.settings.customizeUI.customAction.flyout.settingsSection.url.helpText',
          {
            defaultMessage:
              'You can use relative paths by prefixing with i.e. /dashboards'
          }
        )}
      >
        <EuiFieldText
          placeholder={i18n.translate(
            'xpack.apm.settings.customizeUI.customAction.flyout.settingsSection.url.placeHolder',
            { defaultMessage: 'i.e. https://www.elastic.co/' }
          )}
          value={url}
          onChange={e => {
            setURL(e.target.value);
          }}
        />
      </EuiFormRow>
    </>
  );
};

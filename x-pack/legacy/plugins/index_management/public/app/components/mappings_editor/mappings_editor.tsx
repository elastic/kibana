/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiTabs, EuiTab } from '@elastic/eui';

import { ConfigurationForm, DocumentFields } from './components';
import { IndexSettings } from './types';
import { State } from './reducer';
import { MappingsState, Props as MappingsStateProps } from './mappings_state';
import { IndexSettingsProvider } from './index_settings_context';

interface Props {
  onUpdate: MappingsStateProps['onUpdate'];
  defaultValue?: { [key: string]: any };
  indexSettings?: IndexSettings;
}

type TabName = 'fields' | 'advanced';

export const MappingsEditor = React.memo(({ onUpdate, defaultValue, indexSettings }: Props) => {
  const [selectedTab, selectTab] = useState<TabName>('fields');

  const parsedDefaultValue = useMemo(() => {
    const {
      _source = {},
      _meta = {},
      dynamic,
      numeric_detection,
      date_detection,
      dynamic_date_formats,
      properties = {},
    } = defaultValue ?? {};

    return {
      configuration: {
        _source,
        _meta,
        dynamic,
        numeric_detection,
        date_detection,
        dynamic_date_formats,
      },
      fields: properties,
    };
  }, [defaultValue]);

  const changeTab = async (
    tab: TabName,
    submitConfigurationForm?: State['configuration']['submitForm']
  ) => {
    if (selectedTab === 'advanced') {
      // When we navigate away we need to submit the form to validate if there are any errors.
      const { isValid: isConfigurationFormValid } = await submitConfigurationForm!();

      if (!isConfigurationFormValid) {
        /**
         * Don't navigate away from the tab if there are errors in the form.
         * For now there is no need to display a CallOut as the form can never be invalid.
         */
        return;
      }
    }

    selectTab(tab);
  };

  return (
    <IndexSettingsProvider indexSettings={indexSettings}>
      <MappingsState onUpdate={onUpdate} defaultValue={parsedDefaultValue}>
        {({ state }) => {
          return (
            <div className="mappingsEditor">
              <EuiTabs>
                <EuiTab
                  onClick={() => changeTab('fields', state.configuration.submitForm)}
                  isSelected={selectedTab === 'fields'}
                >
                  {i18n.translate('xpack.idxMgmt.mappingsEditor.fieldsTabLabel', {
                    defaultMessage: 'Mapped fields',
                  })}
                </EuiTab>
                <EuiTab
                  onClick={() => changeTab('advanced')}
                  isSelected={selectedTab === 'advanced'}
                >
                  {i18n.translate('xpack.idxMgmt.mappingsEditor.advancedTabLabel', {
                    defaultMessage: 'Advanced options',
                  })}
                </EuiTab>
              </EuiTabs>

              <EuiSpacer size="l" />

              {selectedTab === 'fields' ? (
                <DocumentFields />
              ) : (
                <ConfigurationForm defaultValue={state.configuration.defaultValue} />
              )}
            </div>
          );
        }}
      </MappingsState>
    </IndexSettingsProvider>
  );
});

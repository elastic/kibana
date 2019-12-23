/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiTabs, EuiTab } from '@elastic/eui';

import {
  ConfigurationForm,
  DocumentFieldsHeader,
  DocumentFields,
  DocumentFieldsJsonEditor,
} from './components';
import { IndexSettings } from './types';
import { State, Dispatch, MappingsConfiguration } from './reducer';
import { MappingsState, Props as MappingsStateProps } from './mappings_state';
import { IndexSettingsProvider } from './index_settings_context';

interface Props {
  onUpdate: MappingsStateProps['onUpdate'];
  defaultValue?: { [key: string]: any };
  indexSettings?: IndexSettings;
}

type TabName = 'fields' | 'advanced';

export const MappingsEditor = React.memo(
  ({ onUpdate, defaultValue = {}, indexSettings }: Props) => {
    const [selectedTab, selectTab] = useState<TabName>('fields');

    const parsedDefaultValue = useMemo(() => {
      const {
        _source = {},
        dynamic,
        numeric_detection,
        date_detection,
        dynamic_date_formats,
        properties = {},
      } = defaultValue;

      return {
        configuration: {
          _source,
          dynamic,
          numeric_detection,
          date_detection,
          dynamic_date_formats,
        },
        fields: properties,
      };
    }, [defaultValue]);

    const validateConfigurationForm = async (
      configuration: State['configuration']
    ): Promise<{ isValid: boolean; data?: MappingsConfiguration }> => {
      const isValid = await configuration.validate();

      if (!isValid) {
        return { isValid };
      }

      // We create a snapshot of the configuration form data.
      const formData = configuration.data.format();

      return { isValid, data: formData };
    };

    const changeTab = async (tab: TabName, [state, dispatch]: [State, Dispatch]) => {
      if (tab === 'fields') {
        // Navigating away from the configuration form === "sending" the form: we need to validate its data first.
        const { isValid, data } = await validateConfigurationForm(state.configuration);

        if (!isValid) {
          return;
        }

        // We need to update our state "configuration" with this snapshot.
        // It will be used as "defaultValue" when navigating back to the form.
        dispatch({
          type: 'configuration.update',
          value: {
            defaultValue: data!,
            isValid,
            data: { raw: state.configuration.data.raw, format: () => data! },
            validate: () => Promise.resolve(true),
          },
        });
      }

      selectTab(tab);
    };

    return (
      <IndexSettingsProvider indexSettings={indexSettings}>
        <MappingsState onUpdate={onUpdate} defaultValue={parsedDefaultValue}>
          {({ editor: editorType, state, dispatch, getProperties }) => {
            const editor =
              editorType === 'json' ? (
                <DocumentFieldsJsonEditor defaultValue={getProperties()} />
              ) : (
                <DocumentFields />
              );

            const content =
              selectedTab === 'fields' ? (
                <>
                  <DocumentFieldsHeader />
                  <EuiSpacer size="m" />
                  {editor}
                </>
              ) : (
                <ConfigurationForm defaultValue={state.configuration.defaultValue} />
              );

            return (
              <div className="mappingsEditor">
                <EuiTabs>
                  <EuiTab
                    onClick={() => changeTab('fields', [state, dispatch])}
                    isSelected={selectedTab === 'fields'}
                  >
                    {i18n.translate('xpack.idxMgmt.mappingsEditor.fieldsTabLabel', {
                      defaultMessage: 'Mapped fields',
                    })}
                  </EuiTab>
                  <EuiTab
                    onClick={() => changeTab('advanced', [state, dispatch])}
                    isSelected={selectedTab === 'advanced'}
                  >
                    {i18n.translate('xpack.idxMgmt.mappingsEditor.advancedTabLabel', {
                      defaultMessage: 'Advanced options',
                    })}
                  </EuiTab>
                </EuiTabs>

                <EuiSpacer size="l" />

                {content}
              </div>
            );
          }}
        </MappingsState>
      </IndexSettingsProvider>
    );
  }
);

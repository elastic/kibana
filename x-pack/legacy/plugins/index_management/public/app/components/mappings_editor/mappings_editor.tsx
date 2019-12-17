/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { pick } from 'lodash';
import { EuiSpacer, EuiTabs, EuiTab } from '@elastic/eui';

import {
  ConfigurationForm,
  CONFIGURATION_FIELDS,
  DocumentFieldsHeader,
  DocumentFields,
  DocumentFieldsJsonEditor,
} from './components';
import { IndexSettings } from './types';
import { MappingsState, Props as MappingsStateProps, Types } from './mappings_state';
import { IndexSettingsProvider } from './index_settings_context';

interface Props {
  onUpdate: MappingsStateProps['onUpdate'];
  defaultValue?: { [key: string]: any };
  indexSettings?: IndexSettings;
}

export const MappingsEditor = React.memo(
  ({ onUpdate, defaultValue = {}, indexSettings }: Props) => {
    const [selectedTab, selectTab] = useState<'fields' | 'advanced'>('fields');

    const { configurationDefaultValue, fieldsDefaultValue } = useMemo(
      () => ({
        configurationDefaultValue: {
          ...(pick(defaultValue, CONFIGURATION_FIELDS) as Types['MappingsConfiguration']),
          _source: defaultValue._source || {},
        },
        fieldsDefaultValue: defaultValue.properties || {},
      }),
      [defaultValue]
    );

    return (
      <IndexSettingsProvider indexSettings={indexSettings}>
        <MappingsState onUpdate={onUpdate} defaultValue={{ fields: fieldsDefaultValue }}>
          {({ editor: editorType, getProperties }) => {
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
                <ConfigurationForm defaultValue={configurationDefaultValue} />
              );

            return (
              <div className="mappingsEditor">
                <EuiTabs>
                  <EuiTab onClick={() => selectTab('fields')} isSelected={selectedTab === 'fields'}>
                    {i18n.translate('xpack.idxMgmt.mappingsEditor.fieldsTabLabel', {
                      defaultMessage: 'Mapped fields',
                    })}
                  </EuiTab>
                  <EuiTab
                    onClick={() => selectTab('advanced')}
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

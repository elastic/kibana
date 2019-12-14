/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { pick } from 'lodash';
import { EuiSpacer } from '@elastic/eui';

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
    const { configurationDefaultValue, sourceFieldDefaultValue, fieldsDefaultValue } = useMemo(
      () => ({
        configurationDefaultValue: pick(
          defaultValue,
          CONFIGURATION_FIELDS
        ) as Types['MappingsConfiguration'],
        sourceFieldDefaultValue: defaultValue._source || {},
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

            return (
              <div className="mappingsEditor">
                <ConfigurationForm defaultValue={configurationDefaultValue} />
                <EuiSpacer />
                <DocumentFieldsHeader />
                <EuiSpacer />
                {editor}
              </div>
            );
          }}
        </MappingsState>
      </IndexSettingsProvider>
    );
  }
);

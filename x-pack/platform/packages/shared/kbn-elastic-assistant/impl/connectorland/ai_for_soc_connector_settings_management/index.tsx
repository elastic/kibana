/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { SettingsStart } from '@kbn/core-ui-settings-browser';
import { SearchConnectorSettingsManagement } from './search_connector_settings_management';
import { ConnectorsSettingsManagement } from '../connector_settings_management';
import { AIConnector } from '../connector_selector';

interface Props {
  connectors: AIConnector[] | undefined;
  settings: SettingsStart;
}

export const AIForSOCConnectorSettingsManagement = ({ connectors, settings }: Props) => {
  return (
    <>
      <ConnectorsSettingsManagement connectors={connectors} settings={settings} />
      <EuiSpacer size="m" />
      <SearchConnectorSettingsManagement />
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { SettingsStart } from '@kbn/core-ui-settings-browser';
import { ApplicationStart } from '@kbn/core/public';
import { SearchConnectorSettingsManagement } from './search_connector_settings_management';
import { ConnectorsSettingsManagement } from '../connector_settings_management';
import { useAssistantContext } from '../../assistant_context';
import { AIConnector } from '../connector_selector';

interface Props {
  settings: SettingsStart;
  application: ApplicationStart;
  connectors: AIConnector[] | undefined;
}

export const AIForSOCConnectorSettingsManagement = ({
  settings,
  application,
  connectors,
}: Props) => {
  const { docLinks } = useAssistantContext();

  return (
    <>
      <ConnectorsSettingsManagement
        docLinks={docLinks}
        settings={settings}
        application={application}
        connectors={connectors}
      />
      <EuiSpacer size="m" />
      <SearchConnectorSettingsManagement />
    </>
  );
};

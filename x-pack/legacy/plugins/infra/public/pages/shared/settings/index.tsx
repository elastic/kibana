/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';
import { UICapabilities } from 'ui/capabilities';
import { injectUICapabilities } from 'ui/capabilities/react';
import { SourceConfigurationSettings } from '../../../components/source_configuration/source_configuration_settings';

interface SettingsPageProps {
  intl: InjectedIntl;
  uiCapabilities: UICapabilities;
}

export const SettingsPage = injectUICapabilities(
  injectI18n(({ intl, uiCapabilities }: SettingsPageProps) => (
    <SourceConfigurationSettings shouldAllowEdit={uiCapabilities.logs.configureSource as boolean} />
  ))
);

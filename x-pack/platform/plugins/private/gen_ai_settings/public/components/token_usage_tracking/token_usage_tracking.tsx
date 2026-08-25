/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FieldRow, FieldRowProvider } from '@kbn/management-settings-components-field-row';
import { GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING } from '@kbn/management-settings-ids';
import { useSettingsContext } from '../../contexts/settings_context';
import { useKibana } from '../../hooks/use_kibana';

export const TokenUsageTracking: React.FC = () => {
  const { fields, handleFieldChange, unsavedChanges } = useSettingsContext();
  const {
    services: { settings, notifications, docLinks, application },
  } = useKibana();

  const field = fields[GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING];

  if (!field) {
    return null;
  }

  const canEditAdvancedSettings = application.capabilities.advancedSettings?.save;

  return (
    <>
      <EuiSpacer size="l" />
      <FieldRowProvider
        links={docLinks.links.management}
        showDanger={(message: string) => notifications.toasts.addDanger(message)}
        validateChange={(key: string, value: any) => settings.client.validateValue(key, value)}
      >
        <FieldRow
          field={field}
          isSavingEnabled={!!canEditAdvancedSettings}
          onFieldChange={handleFieldChange}
          unsavedChange={unsavedChanges[GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING]}
        />
      </FieldRowProvider>
    </>
  );
};

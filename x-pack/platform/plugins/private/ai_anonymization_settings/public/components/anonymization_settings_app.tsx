/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiPageSection, EuiSpacer, EuiSplitPanel, EuiText } from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { isEmpty } from 'lodash';
import { aiAnonymizationSettings } from '@kbn/inference-common';
import { FieldRow, FieldRowProvider } from '@kbn/management-settings-components-field-row';
import { useEditableSettings } from '../hooks/use_editable_settings';
import { useKibana } from '../hooks/use_kibana';
import { BottomBarActions } from './bottom_bar_actions/bottom_bar_actions';

interface AnonymizationSettingsAppProps {
  setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
}

const pageTitle = i18n.translate('xpack.aiAnonymizationSettings.pageTitle', {
  defaultMessage: 'Anonymization',
});

const settingsKeys = [aiAnonymizationSettings];

export const AnonymizationSettingsApp: React.FC<AnonymizationSettingsAppProps> = ({
  setBreadcrumbs,
}) => {
  const {
    services: { application, docLinks, notifications, settings },
  } = useKibana();

  const { fields, unsavedChanges, handleFieldChange, saveAll, isSaving, cleanUnsavedChanges } =
    useEditableSettings(settingsKeys);

  const canEditAdvancedSettings = application.capabilities.advancedSettings?.save;
  const hasInvalidChanges = Object.values(unsavedChanges).some(({ isInvalid }) => isInvalid);

  useEffect(() => {
    setBreadcrumbs([
      {
        text: i18n.translate('xpack.aiAnonymizationSettings.breadcrumbs.ai', {
          defaultMessage: 'AI',
        }),
      },
      {
        text: pageTitle,
      },
    ]);
  }, [setBreadcrumbs]);

  async function handleSave() {
    try {
      await saveAll();
      window.location.reload();
    } catch (e) {
      const error = e as Error;
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.aiAnonymizationSettings.save.error', {
          defaultMessage: 'An error occurred while saving the settings',
        }),
        text: error.message,
      });
    }
  }

  return (
    <>
      <div data-test-subj="aiAnonymizationSettingsPage">
        <AppHeader title={pageTitle} spacing="bleed" />
        <EuiSpacer size="l" />

        <EuiPageSection paddingSize="none">
          <EuiSplitPanel.Outer hasBorder grow={false}>
            <EuiSplitPanel.Inner color="subdued">
              <EuiText size="s">
                <FormattedMessage
                  id="xpack.aiAnonymizationSettings.description"
                  defaultMessage="Configure regex and named-entity-recognition (NER) rules used to anonymize sensitive data before it is sent to the LLM. Applies to every AI feature that uses the inference plugin's chatComplete API."
                />
              </EuiText>
            </EuiSplitPanel.Inner>
            <EuiSplitPanel.Inner>
              {settingsKeys.map((settingKey) => {
                const field = fields[settingKey];

                if (!field) {
                  return null;
                }

                return (
                  <FieldRowProvider
                    key={settingKey}
                    {...{
                      links: docLinks.links.management,
                      showDanger: (message: string) => notifications.toasts.addDanger(message),
                      validateChange: (key: string, value: any) =>
                        settings.client.validateValue(key, value),
                    }}
                  >
                    <FieldRow
                      field={field}
                      isSavingEnabled={!!canEditAdvancedSettings}
                      onFieldChange={handleFieldChange}
                      unsavedChange={unsavedChanges[settingKey]}
                    />
                  </FieldRowProvider>
                );
              })}
            </EuiSplitPanel.Inner>
          </EuiSplitPanel.Outer>
        </EuiPageSection>
      </div>
      {!isEmpty(unsavedChanges) && (
        <BottomBarActions
          isLoading={isSaving}
          onDiscardChanges={cleanUnsavedChanges}
          onSave={handleSave}
          saveLabel={i18n.translate('xpack.aiAnonymizationSettings.settings.saveButton', {
            defaultMessage: 'Save changes',
          })}
          unsavedChangesCount={Object.keys(unsavedChanges).length}
          appTestSubj="aiAnonymizationSettings"
          areChangesInvalid={hasInvalidChanges}
        />
      )}
    </>
  );
};

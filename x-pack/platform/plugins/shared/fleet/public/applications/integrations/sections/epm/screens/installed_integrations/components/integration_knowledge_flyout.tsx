/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';

import {
  useAuthz,
  useGetSettingsQuery,
  usePutSettingsMutation,
  useStartServices,
} from '../../../../../hooks';
import { Loading } from '../../../../../components';

export const IntegrationKnowledgeFlyout: React.FunctionComponent<{
  onClose: () => void;
}> = ({ onClose }) => {
  const [integrationKnowledgeSetting, setIntegrationKnowledgeSetting] =
    React.useState<boolean>(false);

  const authz = useAuthz();
  const { notifications, docLinks } = useStartServices();

  const { data: settings, isInitialLoading: isSettingsInitialLoading } = useGetSettingsQuery({
    enabled: authz.fleet.readSettings,
  });

  useEffect(() => {
    const isEnabled = Boolean(settings?.item.integration_knowledge_enabled);
    setIntegrationKnowledgeSetting(isEnabled);
  }, [settings?.item.integration_knowledge_enabled]);

  const { mutateAsync: mutateSettingsAsync } = usePutSettingsMutation();

  const updateSettings = useCallback(
    async (integrationKnowledgeEnabled: boolean) => {
      try {
        setIntegrationKnowledgeSetting(integrationKnowledgeEnabled);
        const res = await mutateSettingsAsync({
          integration_knowledge_enabled: integrationKnowledgeEnabled,
        });

        if (res.error) {
          throw res.error;
        }
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.fleet.integrationKnowledgeFlyout.successUpdatingSettings', {
            defaultMessage: 'Integration knowledge setting updated successfully',
          }),
        });
      } catch (error) {
        setIntegrationKnowledgeSetting(!integrationKnowledgeEnabled);
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.fleet.integrationKnowledgeFlyout.errorUpdatingSettings', {
            defaultMessage: 'Error updating intergration knowledge setting',
          }),
        });
      }
    },
    [mutateSettingsAsync, notifications.toasts]
  );

  const saveIntegrationKnowledgeSetting = (setting: boolean) => {
    updateSettings(setting);
    onClose();
  };
  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      data-test-subj="integrationKnowledgeFlyout"
      aria-label="Integration Knowledge Flyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="xpack.fleet.integrationKnowledgeFlyout.title"
              defaultMessage="Integration knowledge"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isSettingsInitialLoading ? (
          <Loading />
        ) : (
          <EuiFlexGroup direction="column" gutterSize="l" alignItems="flexStart">
            <EuiFlexItem>
              <EuiText size="s">
                <h3>
                  <FormattedMessage
                    id="xpack.fleet.integrationKnowledgeFlyout.howItWorksTitle"
                    defaultMessage="How does it work?"
                  />
                </h3>
                <p>
                  <FormattedMessage
                    id="xpack.fleet.integrationKnowledgeFlyout.howItWorksDescription"
                    defaultMessage="Integration documentation and metadata are processed through Elastic Inference Service to create embeddings that enhance AI Assistant's understanding of your environment."
                  />
                </p>
                <h3>
                  <FormattedMessage
                    id="xpack.fleet.integrationKnowledgeFlyout.whatGetsIndexedTitle"
                    defaultMessage="What gets indexed"
                  />
                </h3>
                <ul>
                  <li>
                    <FormattedMessage
                      id="xpack.fleet.integrationKnowledgeFlyout.integrationDocumentationText"
                      defaultMessage="Integration documentation"
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="xpack.fleet.integrationKnowledgeFlyout.configurationMetadataText"
                      defaultMessage="Configuration metadata"
                    />
                  </li>
                  <li>
                    <FormattedMessage
                      id="xpack.fleet.integrationKnowledgeFlyout.schemaDefinitionsText"
                      defaultMessage="Schema definitions"
                    />
                  </li>
                </ul>
                <h3>
                  <FormattedMessage
                    id="xpack.fleet.integrationKnowledgeFlyout.costTitle"
                    defaultMessage="Cost"
                  />
                </h3>
                <p>
                  <FormattedMessage
                    id="xpack.fleet.integrationKnowledgeFlyout.costDescription"
                    defaultMessage="Indexing uses Elastic Inference Service and incurs minimal per-token costs."
                  />{' '}
                  <EuiLink
                    href={docLinks.links.enterpriseSearch.elasticInferenceService}
                    target="_blank"
                  >
                    <FormattedMessage
                      id="xpack.fleet.integrationKnowledgeFlyout.learnMoreLink"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                </p>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiSwitch
                checked={integrationKnowledgeSetting}
                onChange={(e) => setIntegrationKnowledgeSetting(e.target.checked)}
                label={
                  <FormattedMessage
                    id="xpack.fleet.integrationKnowledgeFlyout.enableIntegrationKnowledgeLabel"
                    defaultMessage="Use integration knowledge in all installed integrations"
                  />
                }
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} aria-label="Cancel">
              <FormattedMessage
                id="xpack.fleet.integrationKnowledgeFlyout.cancelButtonLabel"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              color="primary"
              onClick={() => saveIntegrationKnowledgeSetting(integrationKnowledgeSetting)}
              aria-label="Save"
              disabled={
                integrationKnowledgeSetting ===
                Boolean(settings?.item.integration_knowledge_enabled)
              }
            >
              <FormattedMessage
                id="xpack.fleet.integrationKnowledgeFlyout.saveButtonLabel"
                defaultMessage="Save"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

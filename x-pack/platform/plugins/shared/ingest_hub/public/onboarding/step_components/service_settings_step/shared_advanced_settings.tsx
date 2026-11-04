/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiLink, EuiSpacer, EuiSwitch, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import { getNamespaceError, InstanceNamespaceField } from './instance_namespace_field';

interface SharedAdvancedSettingsProps {
  namespace: string;
  onNamespaceChange: (namespace: string) => void;
  dedicatedNamespaceTemplates: boolean;
  onDedicatedNamespaceTemplatesChange: (enabled: boolean) => void;
  /** Whether services are already deployed, which changes what a new namespace means. */
  hasDeployedServices: boolean;
}

/**
 * The advanced fields of the shared settings form, in the same two columns as the main fields.
 * Each new advanced setting is another grid item.
 */
export function SharedAdvancedSettings({
  namespace,
  onNamespaceChange,
  dedicatedNamespaceTemplates,
  onDedicatedNamespaceTemplatesChange,
  hasDeployedServices,
}: SharedAdvancedSettingsProps) {
  const { services } = useKibana<CoreStart>();
  // Like Fleet's switch, it needs a valid namespace to act on.
  const isDedicatedTemplatesDisabled = !namespace.trim() || !!getNamespaceError(namespace);

  return (
    <EuiFlexGrid columns={2} gutterSize="l" data-test-subj="sharedAdvancedSettings">
      <EuiFlexItem>
        <InstanceNamespaceField
          fullWidth
          compressed
          namespace={namespace}
          onChange={onNamespaceChange}
          note={
            hasDeployedServices
              ? i18n.translate(
                  'xpack.ingestHub.integrationSettings.advanced.namespace.deployedNote',
                  {
                    defaultMessage:
                      'On the next deploy, services that follow this setting switch to the value entered here. Data already collected stays in the previous namespace.',
                  }
                )
              : undefined
          }
          data-test-subj="sharedSettingsNamespace"
        />
        <EuiSpacer size="m" />
        <EuiSwitch
          compressed
          label={i18n.translate(
            'xpack.ingestHub.integrationSettings.advanced.dedicatedNamespaceTemplates.label',
            { defaultMessage: 'Use dedicated index templates for this namespace' }
          )}
          checked={dedicatedNamespaceTemplates}
          disabled={isDedicatedTemplatesDisabled}
          onChange={(e) => onDedicatedNamespaceTemplatesChange(e.target.checked)}
          data-test-subj="sharedSettingsDedicatedNamespaceTemplates"
        />
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="xpack.ingestHub.integrationSettings.advanced.dedicatedNamespaceTemplates.helpText"
            defaultMessage="Enables independent settings and mappings for this namespace's data streams. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink
                  href={services.docLinks.links.fleet.datastreams}
                  external
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.ingestHub.integrationSettings.advanced.dedicatedNamespaceTemplates.learnMore"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGrid>
  );
}

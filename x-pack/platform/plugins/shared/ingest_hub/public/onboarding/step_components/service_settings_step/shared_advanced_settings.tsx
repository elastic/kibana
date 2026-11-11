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
import { OutputField, type OutputFieldProps } from './output_field';
import { ProxyUrlField, type ProxyUrlFieldProps } from './proxy_url_field';
import { ConditionField, type ConditionFieldProps } from './condition_field';
import {
  ReroutePermissionsField,
  type ReroutePermissionsFieldProps,
} from './reroute_permissions_field';

interface SharedAdvancedSettingsProps {
  namespace: string;
  onNamespaceChange: (namespace: string) => void;
  dedicatedNamespaceTemplates: boolean;
  onDedicatedNamespaceTemplatesChange: (enabled: boolean) => void;
  /** No selected service deploys as a policy, so the switch would have nothing to apply to. */
  isDedicatedTemplatesUnavailable?: boolean;
  /** Whether services are already deployed, which changes what a new namespace means. */
  hasDeployedServices: boolean;
  /** Whether an ECF stack is already launched, which only takes a new namespace once updated. */
  hasLaunchedEcfStack?: boolean;
  /** Whether a selected service does not follow the namespace (some ECF templates take none). */
  hasServicesIgnoringNamespace?: boolean;
  /** The output field. It applies to agent-based deploys only, so managed and ECF leave it out. */
  output?: OutputFieldProps;
  /** The proxy URL field. It applies to agent-based and managed integration deploys, not ECF. */
  proxyUrl?: ProxyUrlFieldProps;
  /** The condition field. Like the output, agent-based deploys only. */
  condition?: ConditionFieldProps;
  /** The reroute permissions field. It applies to agent-based and managed integration deploys. */
  reroutePermissions?: ReroutePermissionsFieldProps;
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
  isDedicatedTemplatesUnavailable = false,
  hasDeployedServices,
  hasLaunchedEcfStack = false,
  hasServicesIgnoringNamespace = false,
  output,
  proxyUrl,
  condition,
  reroutePermissions,
}: SharedAdvancedSettingsProps) {
  const { services } = useKibana<CoreStart>();
  // Like Fleet's switch, it needs a valid namespace to act on.
  const isDedicatedTemplatesDisabled =
    isDedicatedTemplatesUnavailable || !namespace.trim() || !!getNamespaceError(namespace);

  const notes = [
    hasDeployedServices &&
      i18n.translate('xpack.ingestHub.integrationSettings.advanced.namespace.deployedNote', {
        defaultMessage:
          'On the next deploy, services that follow this setting switch to the value entered here. Data already collected stays in the previous namespace.',
      }),
    hasLaunchedEcfStack &&
      i18n.translate('xpack.ingestHub.integrationSettings.advanced.namespace.ecfStackNote', {
        defaultMessage:
          'A launched CloudFormation stack takes the new value once you update it in AWS.',
      }),
    hasServicesIgnoringNamespace &&
      i18n.translate('xpack.ingestHub.integrationSettings.advanced.namespace.ignoredNote', {
        defaultMessage:
          'Some selected services are deployed with a CloudFormation template that does not use this setting.',
      }),
  ].filter((note): note is string => Boolean(note));

  return (
    <EuiFlexGrid columns={2} gutterSize="l" data-test-subj="sharedAdvancedSettings">
      <EuiFlexItem>
        <InstanceNamespaceField
          fullWidth
          compressed
          namespace={namespace}
          onChange={onNamespaceChange}
          note={notes}
          data-test-subj="sharedSettingsNamespace"
        />
        <EuiSpacer size="m" />
        <EuiSwitch
          compressed
          label={i18n.translate(
            'xpack.ingestHub.integrationSettings.advanced.dedicatedNamespaceTemplates.label',
            { defaultMessage: 'Use dedicated index templates for this namespace' }
          )}
          checked={dedicatedNamespaceTemplates && !isDedicatedTemplatesUnavailable}
          disabled={isDedicatedTemplatesDisabled}
          onChange={(e) => onDedicatedNamespaceTemplatesChange(e.target.checked)}
          data-test-subj="sharedSettingsDedicatedNamespaceTemplates"
        />
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          {isDedicatedTemplatesUnavailable && (
            <p data-test-subj="sharedSettingsDedicatedNamespaceTemplates-unavailable">
              {i18n.translate(
                'xpack.ingestHub.integrationSettings.advanced.dedicatedNamespaceTemplates.unavailable',
                {
                  defaultMessage:
                    'Not available when all selected services deploy through Elastic Cloud Forwarder.',
                }
              )}
            </p>
          )}
          <FormattedMessage
            id="xpack.ingestHub.integrationSettings.advanced.dedicatedNamespaceTemplates.helpText"
            defaultMessage="Enables independent settings and mappings for this namespace's data streams. Also applies to other policies of the same integrations that use this namespace. {learnMoreLink}"
            values={{
              learnMoreLink: (
                <EuiLink href={services.docLinks.links.fleet.datastreams} external target="_blank">
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
      {output && (
        <EuiFlexItem>
          <OutputField {...output} />
        </EuiFlexItem>
      )}
      {proxyUrl && (
        <EuiFlexItem>
          <ProxyUrlField {...proxyUrl} />
        </EuiFlexItem>
      )}
      {condition && (
        <EuiFlexItem>
          <ConditionField {...condition} />
        </EuiFlexItem>
      )}
      {reroutePermissions && (
        <EuiFlexItem>
          <ReroutePermissionsField {...reroutePermissions} />
        </EuiFlexItem>
      )}
    </EuiFlexGrid>
  );
}

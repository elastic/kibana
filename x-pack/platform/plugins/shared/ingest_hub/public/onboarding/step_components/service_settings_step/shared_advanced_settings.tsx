/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { InstanceNamespaceField } from './instance_namespace_field';

interface SharedAdvancedSettingsProps {
  namespace: string;
  onNamespaceChange: (namespace: string) => void;
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
  hasDeployedServices,
}: SharedAdvancedSettingsProps) {
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
      </EuiFlexItem>
    </EuiFlexGrid>
  );
}

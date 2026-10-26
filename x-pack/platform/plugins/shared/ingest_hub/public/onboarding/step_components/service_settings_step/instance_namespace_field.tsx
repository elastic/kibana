/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { isValidNamespace } from '@kbn/fleet-plugin/common';
import { NamespaceComboBox } from '@kbn/fleet-plugin/public';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

const INHERITED_NAMESPACE_PLACEHOLDER = 'default';

/** Namespace only applies to services deployed as a policy; ECF has no namespace. */
export const supportsNamespace = (service: AwsServiceMatrixEntry): boolean =>
  !service.deploymentMethods.every((dm) => dm.method === 'ecf');

export const getNamespaceError = (namespace: string): string | undefined => {
  const { valid, error } = isValidNamespace(namespace, true);
  return valid ? undefined : error;
};

interface InstanceNamespaceFieldProps {
  namespace: string;
  onChange: (namespace: string) => void;
  /** Extra note under the field, e.g. what a change means for services that are already deployed. */
  note?: string;
  /**
   * For a duplicate, whose empty namespace is the global one, so the tooltip says so instead of
   * describing the default or the agent policy's namespace.
   */
  emptyUsesGlobal?: boolean;
  fullWidth?: boolean;
  compressed?: boolean;
  'data-test-subj'?: string;
}

export const InstanceNamespaceField = ({
  namespace,
  onChange,
  note,
  emptyUsesGlobal = false,
  fullWidth = false,
  compressed = false,
  'data-test-subj': dataTestSubj = 'serviceSettings-namespaceField',
}: InstanceNamespaceFieldProps) => {
  const { services } = useKibana<CoreStart>();
  const error = getNamespaceError(namespace);

  return (
    <>
      <NamespaceComboBox
        namespace={namespace}
        placeholder={INHERITED_NAMESPACE_PLACEHOLDER}
        isEditPage={false}
        validationError={error ? [error] : null}
        docLinks={services.docLinks}
        onNamespaceChange={onChange}
        fullWidth={fullWidth}
        compressed={compressed}
        helpTextAsTooltip
        tooltipContent={
          emptyUsesGlobal
            ? i18n.translate(
                'xpack.ingestHub.serviceSettingsStep.namespace.globalFallbackTooltip',
                {
                  defaultMessage:
                    "Sets the namespace in the integration's data stream name. Leave empty to use the global namespace.",
                }
              )
            : undefined
        }
        data-test-subj={dataTestSubj}
      />
      {note && (
        <EuiText size="xs" color="subdued" data-test-subj={`${dataTestSubj}-note`}>
          {note}
        </EuiText>
      )}
    </>
  );
};

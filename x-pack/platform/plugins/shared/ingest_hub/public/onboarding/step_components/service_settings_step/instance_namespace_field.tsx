/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
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
  /** True once the instance has a deployed policy; the namespace is then read-only. */
  isLocked?: boolean;
}

export const InstanceNamespaceField = ({
  namespace,
  onChange,
  isLocked = false,
}: InstanceNamespaceFieldProps) => {
  const { services } = useKibana<CoreStart>();

  if (isLocked) {
    return (
      <EuiFormRow
        label={i18n.translate('xpack.ingestHub.serviceSettingsStep.namespace.label', {
          defaultMessage: 'Namespace',
        })}
        helpText={i18n.translate('xpack.ingestHub.serviceSettingsStep.namespace.lockedHelp', {
          defaultMessage: 'The namespace cannot be changed after the service is deployed.',
        })}
      >
        <EuiFieldText
          value={namespace}
          // The deployed policy may sit on an existing agent policy, whose namespace is not always `default`.
          placeholder={i18n.translate(
            'xpack.ingestHub.serviceSettingsStep.namespace.lockedInheritedPlaceholder',
            { defaultMessage: 'Inherited from the agent policy' }
          )}
          disabled
          data-test-subj="serviceSettings-namespaceField-locked"
        />
      </EuiFormRow>
    );
  }

  const error = getNamespaceError(namespace);

  return (
    <NamespaceComboBox
      namespace={namespace}
      placeholder={INHERITED_NAMESPACE_PLACEHOLDER}
      isEditPage={false}
      validationError={error ? [error] : null}
      docLinks={services.docLinks}
      onNamespaceChange={onChange}
      data-test-subj="serviceSettings-namespaceField"
    />
  );
};

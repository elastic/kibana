/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import type { FederatedIdentityClusterInfo } from './federated_identity_cluster_info';

function ReadOnlyFormRow({ label, value }: { label: string; value: string }) {
  return (
    <EuiFormRow label={label} fullWidth>
      <EuiFieldText readOnly fullWidth value={value} />
    </EuiFormRow>
  );
}

/**
 * Three read-only fields shown below Role ARN in the S3 federated identity auth section.
 * They display cluster-level values the user needs to configure the CSP trust policy.
 * These fields do NOT use useController, so they are never submitted with the form.
 */
export function FederatedIdentityClusterInfoFields({
  cloudInfo,
}: {
  cloudInfo?: FederatedIdentityClusterInfo;
}) {
  return (
    <>
      <ReadOnlyFormRow
        label={i18n.translate('xpack.dataFederation.createFlyout.s3.federated.jwtIssuer', {
          defaultMessage: 'JWT issuer',
        })}
        value={cloudInfo?.jwtIssuer ?? ''}
      />
      <ReadOnlyFormRow
        label={i18n.translate('xpack.dataFederation.createFlyout.s3.federated.cloudOrgId', {
          defaultMessage: 'Cloud organization ID',
        })}
        value={cloudInfo?.cloudOrgId ?? ''}
      />
      <ReadOnlyFormRow
        label={
          cloudInfo?.isServerless
            ? i18n.translate('xpack.dataFederation.createFlyout.s3.federated.projectId', {
                defaultMessage: 'Project ID',
              })
            : i18n.translate('xpack.dataFederation.createFlyout.s3.federated.deploymentId', {
                defaultMessage: 'Deployment ID',
              })
        }
        value={cloudInfo?.deploymentId ?? ''}
      />
    </>
  );
}

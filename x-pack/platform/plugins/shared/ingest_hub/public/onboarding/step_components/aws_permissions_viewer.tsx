/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { IamPolicyDocument } from '../../../common/iam_policy_document';

export const AWS_PERMISSIONS_VIEWER_TEST_SUBJ = 'awsPermissionsViewer';
export const ALL_SERVICES_OPTION_VALUE = '__all__';

export interface AwsPermissionsViewerService {
  id: string;
  name: string;
}

export interface AwsPermissionsViewerProps {
  /** Per-service policy documents keyed by service id, from the endpoint. */
  byService: Record<string, IamPolicyDocument>;
  /** Deduped union of all service permissions, from the endpoint. */
  merged: IamPolicyDocument;
  /** Display info for the dropdown (id + name). */
  services: AwsPermissionsViewerService[];
}

function getServiceLabel(service: AwsPermissionsViewerService, hasDuplicateNames: boolean): string {
  return hasDuplicateNames ? `${service.name} (${service.id})` : service.name;
}

export const AwsPermissionsViewer: React.FC<AwsPermissionsViewerProps> = ({
  byService,
  merged,
  services,
}) => {
  const [selectedOption, setSelectedOption] = useState(ALL_SERVICES_OPTION_VALUE);

  const duplicateNames = useMemo(() => {
    const nameCounts = new Map<string, number>();
    for (const { name } of services) {
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
    }
    return new Set(
      [...nameCounts.entries()].filter(([, count]) => count > 1).map(([name]) => name)
    );
  }, [services]);

  const selectOptions = useMemo(() => {
    const allIntegrationsLabel = i18n.translate(
      'xpack.ingestHub.awsPermissionsViewer.allIntegrationsOption',
      { defaultMessage: 'All integrations' }
    );

    return [
      { value: ALL_SERVICES_OPTION_VALUE, text: allIntegrationsLabel },
      ...services
        .filter(({ id }) => id in byService)
        .map((service) => ({
          value: service.id,
          text: getServiceLabel(service, duplicateNames.has(service.name)),
        })),
    ];
  }, [services, byService, duplicateNames]);

  // Fall back to "all" if the selected service is no longer in the list.
  useEffect(() => {
    if (selectedOption !== ALL_SERVICES_OPTION_VALUE && !(selectedOption in byService)) {
      setSelectedOption(ALL_SERVICES_OPTION_VALUE);
    }
  }, [byService, selectedOption]);

  const policyDocument = useMemo(() => {
    if (selectedOption === ALL_SERVICES_OPTION_VALUE) {
      return JSON.stringify(merged, null, 2);
    }
    const doc = byService[selectedOption];
    return doc ? JSON.stringify(doc, null, 2) : JSON.stringify(merged, null, 2);
  }, [selectedOption, merged, byService]);

  // Only render when there are services with permissions.
  const hasPermissions = merged.Statement.length > 0 && merged.Statement[0].Action.length > 0;
  if (!hasPermissions) {
    return null;
  }

  return (
    <div data-test-subj={AWS_PERMISSIONS_VIEWER_TEST_SUBJ}>
      <EuiPanel
        paddingSize="none"
        hasBorder
        data-test-subj={`${AWS_PERMISSIONS_VIEWER_TEST_SUBJ}-panel`}
      >
        <EuiPanel color="subdued" paddingSize="s" hasShadow={false} hasBorder={false}>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type="securityApp"
                    size="m"
                    color="primary"
                    aria-hidden={true}
                    data-test-subj={`${AWS_PERMISSIONS_VIEWER_TEST_SUBJ}-titleIcon`}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h4>
                      <FormattedMessage
                        id="xpack.ingestHub.awsPermissionsViewer.title"
                        defaultMessage="Required IAM permissions"
                      />
                    </h4>
                  </EuiTitle>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSelect
                compressed
                options={selectOptions}
                value={selectedOption}
                onChange={(event) => setSelectedOption(event.target.value)}
                aria-label={i18n.translate(
                  'xpack.ingestHub.awsPermissionsViewer.integrationSelectorLabel',
                  { defaultMessage: 'View permissions for' }
                )}
                data-test-subj={`${AWS_PERMISSIONS_VIEWER_TEST_SUBJ}-serviceSelector`}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
        <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false}>
          <EuiText size="s" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.ingestHub.awsPermissionsViewer.intro"
                defaultMessage="Attach this policy to the IAM user whose access keys you'll enter below."
              />
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeBlock
            language="json"
            isCopyable
            paddingSize="s"
            overflowHeight={200}
            fontSize="s"
            data-test-subj={`${AWS_PERMISSIONS_VIEWER_TEST_SUBJ}-actionsList`}
          >
            {policyDocument}
          </EuiCodeBlock>
        </EuiPanel>
      </EuiPanel>
      <EuiSpacer size="l" />
    </div>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiButtonEmpty,
  EuiSpacer,
} from '@elastic/eui';

import { useAgentless } from '../hooks/setup_technology';

import { WithHeaderLayout } from '../../../../../layouts';
import type { AgentPolicy, PackageInfo, RegistryPolicyTemplate } from '../../../../../types';
import { PackageIcon } from '../../../../../components';
import type { EditPackagePolicyFrom } from '../../types';

const AgentPolicyName = styled(EuiDescriptionListDescription)`
  margin-left: auto;
  max-width: 250px;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

export const CreatePackagePolicySinglePageLayout: React.FunctionComponent<{
  from: EditPackagePolicyFrom;
  cancelUrl: string;
  onCancel?: React.ReactEventHandler;
  agentPolicy?: AgentPolicy;
  packageInfo?: PackageInfo;
  integrationInfo?: RegistryPolicyTemplate;
  'data-test-subj'?: string;
  tabs?: Array<{
    title: string;
    isSelected: boolean;
    onClick: React.ReactEventHandler;
  }>;
  children: React.ReactNode;
}> = memo(
  ({
    from,
    cancelUrl,
    onCancel,
    agentPolicy,
    packageInfo,
    integrationInfo,
    children,
    'data-test-subj': dataTestSubj,
    tabs = [],
  }) => {
    const isAdd = useMemo(() => ['package', 'policy'].includes(from), [from]);
    const isEdit = useMemo(() => ['edit', 'package-edit'].includes(from), [from]);
    const isUpgrade = useMemo(
      () =>
        [
          'upgrade-from-fleet-policy-list',
          'upgrade-from-integrations-policy-list',
          'upgrade-from-extension',
        ].includes(from),
      [from]
    );

    const pageTitle = useMemo(() => {
      if ((isAdd || isEdit || isUpgrade) && packageInfo) {
        let pageTitleText = (
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.pageTitleWithPackageName"
            defaultMessage="Add {packageName} integration"
            values={{
              packageName: integrationInfo?.title || packageInfo.title,
            }}
          />
        );

        if (isEdit) {
          pageTitleText = (
            <FormattedMessage
              id="xpack.fleet.editPackagePolicy.editPageTitleWithPackageName"
              defaultMessage="Edit {packageName} integration"
              values={{
                packageName: packageInfo.title,
              }}
            />
          );
        } else if (isUpgrade) {
          pageTitleText = (
            <FormattedMessage
              id="xpack.fleet.editPackagePolicy.upgradePageTitleWithPackageName"
              defaultMessage="Upgrade {packageName} integration"
              values={{
                packageName: packageInfo.title,
              }}
            />
          );
        }

        return (
          <EuiFlexGroup alignItems="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <PackageIcon
                packageName={packageInfo?.name || ''}
                integrationName={integrationInfo?.name}
                version={packageInfo?.version || ''}
                icons={integrationInfo?.icons || packageInfo?.icons}
                size="xl"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText>
                <h1 data-test-subj={`${dataTestSubj}_pageTitle`}>{pageTitleText}</h1>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }

      if (isEdit) {
        return (
          <EuiText>
            <h1 data-test-subj={`${dataTestSubj}_pageTitle`}>
              <FormattedMessage
                id="xpack.fleet.editPackagePolicy.pageTitle"
                defaultMessage="Edit integration"
              />
            </h1>
          </EuiText>
        );
      }

      if (isUpgrade) {
        return (
          <EuiText>
            <h1 data-test-subj={`${dataTestSubj}_pageTitle`}>
              <FormattedMessage
                id="xpack.fleet.upgradePackagePolicy.pageTitle"
                defaultMessage="Upgrade integration"
              />
            </h1>
          </EuiText>
        );
      }

      return (
        <EuiText>
          <h1>
            <FormattedMessage
              id="xpack.fleet.createPackagePolicy.pageTitle"
              defaultMessage="Add integration"
            />
          </h1>
        </EuiText>
      );
    }, [
      dataTestSubj,
      integrationInfo?.icons,
      integrationInfo?.name,
      integrationInfo?.title,
      packageInfo,
      isAdd,
      isEdit,
      isUpgrade,
    ]);

    const pageDescription = useMemo(() => {
      if (isEdit) {
        return (
          <FormattedMessage
            id="xpack.fleet.editPackagePolicy.pageDescription"
            defaultMessage="Modify integration settings and deploy changes to the selected agent policies."
          />
        );
      } else if (isAdd) {
        return (
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.pageDescriptionfromPolicy"
            defaultMessage="Configure an integration for the selected agent policies."
          />
        );
      } else if (isUpgrade) {
        return (
          <FormattedMessage
            id="xpack.fleet.upgradePackagePolicy.pageDescriptionFromUpgrade"
            defaultMessage="Upgrade this integration and deploy changes to the selected agent policies."
          />
        );
      } else {
        return (
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.pageDescriptionfromPackage"
            defaultMessage="Follow these instructions to add this integration to agent policies."
          />
        );
      }
    }, [isAdd, isEdit, isUpgrade]);

    const leftColumn = (
      <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
        <EuiFlexItem>
          {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
          <EuiButtonEmpty
            size="xs"
            iconType="arrowLeft"
            flush="left"
            href={cancelUrl}
            onClick={onCancel}
            data-test-subj={`${dataTestSubj}_cancelBackLink`}
          >
            <FormattedMessage
              id="xpack.fleet.createPackagePolicy.cancelLinkText"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>{pageTitle}</EuiFlexItem>
        <EuiFlexItem>
          <EuiText color="subdued" size="s">
            {pageDescription}
          </EuiText>
          <EuiSpacer size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );

    const { isAgentlessAgentPolicy } = useAgentless();
    const hasAgentBasedPolicyId = !isAgentlessAgentPolicy(agentPolicy);
    const showAgentPolicyName = agentPolicy && (isAdd || isEdit) && hasAgentBasedPolicyId;

    const rightColumn = showAgentPolicyName ? (
      <EuiDescriptionList className="eui-textRight" textStyle="reverse">
        <EuiDescriptionListTitle>
          <FormattedMessage
            id="xpack.fleet.createPackagePolicy.agentPolicyNameLabel"
            defaultMessage="Agent policy"
          />
        </EuiDescriptionListTitle>
        <AgentPolicyName className="eui-textBreakWord" title={agentPolicy?.name || '-'}>
          {agentPolicy?.name || '-'}
        </AgentPolicyName>
      </EuiDescriptionList>
    ) : undefined;

    const maxWidth = 800;
    return (
      <WithHeaderLayout
        restrictHeaderWidth={maxWidth}
        restrictWidth={maxWidth}
        leftColumn={leftColumn}
        rightColumn={rightColumn}
        rightColumnGrow={false}
        data-test-subj={dataTestSubj}
        tabs={tabs.map(({ title, ...rest }) => ({ name: title, ...rest }))}
      >
        {children}
      </WithHeaderLayout>
    );
  }
);

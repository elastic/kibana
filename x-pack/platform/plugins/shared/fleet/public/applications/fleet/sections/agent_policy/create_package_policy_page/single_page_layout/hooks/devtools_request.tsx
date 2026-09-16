/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { omit } from 'lodash';
import { set } from '@kbn/safer-lodash-set';

import {
  generateCreatePackagePolicyDevToolsRequest,
  generateCreateAgentPolicyDevToolsRequest,
  generateUpdatePackagePolicyDevToolsRequest,
} from '../../../services';
import {
  FLEET_SYSTEM_PACKAGE,
  HIDDEN_API_REFERENCE_PACKAGES,
} from '../../../../../../../../common/constants';
import type { PackageInfo, NewAgentPolicy, NewPackagePolicy } from '../../../../../types';
import { ExperimentalFeaturesService, isAgentlessPoliciesUIEnabled } from '../../../../../services';
import { SelectedPolicyTab } from '../../components';
import {
  generateCreateAgentlessPolicyDevToolsRequest,
  generateUpdateAgentlessPolicyDevToolsRequest,
} from '../../../services/devtools_request';

export function useDevToolsRequest({
  newAgentPolicy,
  packagePolicy,
  packageInfo,
  selectedPolicyTab,
  withSysMonitoring,
  packagePolicyId,
  createDatasetTemplates,
}: {
  withSysMonitoring: boolean;
  selectedPolicyTab: SelectedPolicyTab;
  newAgentPolicy: NewAgentPolicy;
  packagePolicy: NewPackagePolicy;
  packageInfo?: PackageInfo;
  packagePolicyId?: string;
  createDatasetTemplates?: boolean;
}) {
  const showDevtoolsRequest = !HIDDEN_API_REFERENCE_PACKAGES.includes(packageInfo?.name ?? '');

  const { enableVarGroups } = ExperimentalFeaturesService.get();
  const varGroups =
    enableVarGroups && packageInfo?.var_groups ? packageInfo?.var_groups : undefined;
  const agentlessUIEnabled = isAgentlessPoliciesUIEnabled();

  const [devtoolRequest, devtoolRequestDescription] = useMemo(() => {
    if (selectedPolicyTab === SelectedPolicyTab.NEW) {
      const packagePolicyIsSystem = packagePolicy?.package?.name === FLEET_SYSTEM_PACKAGE;

      if (packagePolicy.supports_agentless) {
        return [
          generateCreateAgentlessPolicyDevToolsRequest(
            {
              ...packagePolicy,
              create_dataset_templates: createDatasetTemplates,
            },
            varGroups,
            packageInfo
          ),
          i18n.translate(
            'xpack.fleet.editPackagePolicy.devtoolsRequestAgentlessPolicyDescription',
            {
              defaultMessage: 'These Kibana requests create a new managed integration.',
            }
          ),
        ];
      }

      return [
        `${generateCreateAgentPolicyDevToolsRequest(
          newAgentPolicy,
          withSysMonitoring && !packagePolicyIsSystem
        )}\n\n${
          packagePolicyId
            ? generateUpdatePackagePolicyDevToolsRequest(
                packagePolicyId,
                set(omit(packagePolicy, 'elasticsearch', 'spaceIds', 'policy_id'), 'policy_ids', [
                  ...packagePolicy.policy_ids,
                  '',
                ])
              )
            : generateCreatePackagePolicyDevToolsRequest({
                ...packagePolicy,
                policy_ids: [''],
                create_dataset_templates: createDatasetTemplates,
              })
        }`,
        packagePolicyId
          ? i18n.translate(
              'xpack.fleet.editPackagePolicy.devtoolsRequestWithAgentPolicyDescription',
              {
                defaultMessage:
                  'These Kibana requests create a new agent policy and update a package policy.',
              }
            )
          : i18n.translate(
              'xpack.fleet.createPackagePolicy.devtoolsRequestWithAgentPolicyDescription',
              {
                defaultMessage:
                  'These Kibana requests create a new agent policy and a new package policy.',
              }
            ),
      ];
    }

    // Editing an existing agentless policy: preview the agentless full-replace PUT rather than the
    // package-policy update, matching the actual request the edit form now issues. When the
    // agentless policies UI kill switch is off, edits go through the legacy package-policy PUT,
    // so preview that instead (fall-through below).
    if (packagePolicyId && packagePolicy.supports_agentless && agentlessUIEnabled) {
      return [
        generateUpdateAgentlessPolicyDevToolsRequest(
          packagePolicyId,
          packagePolicy,
          varGroups,
          packageInfo
        ),
        i18n.translate(
          'xpack.fleet.editPackagePolicy.devtoolsRequestUpdateAgentlessPolicyDescription',
          {
            defaultMessage: 'This Kibana request updates a managed integration.',
          }
        ),
      ];
    }

    return [
      packagePolicyId
        ? generateUpdatePackagePolicyDevToolsRequest(
            packagePolicyId,
            omit(packagePolicy, 'elasticsearch', 'spaceIds', 'policy_id')
          )
        : generateCreatePackagePolicyDevToolsRequest({
            ...packagePolicy,
            create_dataset_templates: createDatasetTemplates,
          }),
      packagePolicyId
        ? i18n.translate('xpack.fleet.editPackagePolicy.devtoolsRequestDescription', {
            defaultMessage: 'This Kibana request updates package policy.',
          })
        : i18n.translate('xpack.fleet.createPackagePolicy.devtoolsRequestDescription', {
            defaultMessage: 'This Kibana request creates a new package policy.',
          }),
    ];
  }, [
    packagePolicy,
    newAgentPolicy,
    withSysMonitoring,
    selectedPolicyTab,
    packagePolicyId,
    createDatasetTemplates,
    varGroups,
    packageInfo,
    agentlessUIEnabled,
  ]);

  return { showDevtoolsRequest, devtoolRequest, devtoolRequestDescription };
}

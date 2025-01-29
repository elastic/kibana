/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import React, { FunctionComponent } from 'react';
import { EuiDescribedFormGroup, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';

import { useKibana, useFormData } from '../../../../../../../shared_imports';
import { PhaseWithAllocation, DataTierRole } from '../../../../../../../../common/types';
import { getAvailableNodeRoleForPhase, isNodeRoleFirstPreference } from '../../../../../../lib';
import { useLoadNodes } from '../../../../../../services/api';
import { i18nTexts } from '../../../../i18n_texts';
import { DataTierAllocationType } from '../../../../types';

import {
  DataTierAllocation,
  WillUseFallbackTierNotice,
  WillUseFallbackTierUsingNodeAttributesNotice,
  NoTiersAvailableNotice,
  NoTiersAvailableUsingNodeAttributesNotice,
  DefaultToDataNodesNotice,
  DefaultToDataTiersNotice,
  CloudDataTierCallout,
  LoadingError,
} from './components';

import './_data_tier_allocation.scss';

interface Props {
  phase: PhaseWithAllocation;
  description: React.ReactNode;
}

/**
 * Top-level layout control for the data tier allocation field.
 */
export const DataTierAllocationField: FunctionComponent<Props> = ({ phase, description }) => {
  const {
    services: { cloud },
  } = useKibana();

  const dataTierAllocationTypePath = `_meta.${phase}.dataTierAllocationType`;
  const [formData] = useFormData({ watch: dataTierAllocationTypePath });
  const allocationType: DataTierAllocationType = get(formData, dataTierAllocationTypePath);

  const { data, resendRequest, error, isLoading } = useLoadNodes();

  const { nodesByRoles, nodesByAttributes, isUsingDeprecatedDataRoleConfig } = data!;

  const hasNodeAttributes = Boolean(Object.keys(nodesByAttributes ?? {}).length);
  const isCloudEnabled = cloud?.isCloudEnabled ?? false;
  const cloudDeploymentUrl = cloud?.deploymentUrl;

  const allocationNodeRoleForPhase = getAvailableNodeRoleForPhase(phase, nodesByRoles);
  const noTiersAvailable = allocationNodeRoleForPhase === undefined;
  const willUseFallbackTier =
    allocationNodeRoleForPhase !== undefined &&
    !isNodeRoleFirstPreference(phase, allocationNodeRoleForPhase);

  const renderNotice = () => {
    switch (allocationType) {
      case 'node_roles':
        /**
         * On Cloud most users should be using autoscaling which will provision tiers as they are needed. We do not surface any
         * of the notices below.
         */
        if (isCloudEnabled) {
          return null;
        }

        /**
         * Node role allocation moves data in a phase to a corresponding tier of the same name. To prevent policy execution from getting
         * stuck ILM allocation will fall back to a previous tier if possible. We show the WARNING below to inform a user when even
         * this fallback will not succeed.
         */
        if (noTiersAvailable) {
          return (
            <>
              <EuiSpacer size="s" />
              <NoTiersAvailableNotice phase={phase} />
            </>
          );
        }

        /**
         * If we are able to fallback to a data tier that does not map to this phase, we show a notice informing the user that their
         * data will not be assigned to a corresponding tier.
         */
        if (willUseFallbackTier) {
          return (
            <>
              <EuiSpacer size="s" />
              <WillUseFallbackTierNotice
                phase={phase}
                targetNodeRole={allocationNodeRoleForPhase as DataTierRole}
              />
            </>
          );
        }
        break;

      case 'node_attrs':
        /**
         * If there are no node attributes, advise the user on the default allocation behavior.
         */
        if (!hasNodeAttributes) {
          /**
           * If data nodes are available, default allocation behavior will be to those nodes.
           */
          if (isUsingDeprecatedDataRoleConfig) {
            return (
              <>
                <EuiSpacer size="s" />
                <DefaultToDataNodesNotice phase={phase} />
              </>
            );
          }

          /**
           * Node role allocation moves data in a phase to a corresponding tier of the same name. To prevent policy execution from getting
           * stuck ILM allocation will fall back to a previous tier if possible. We show the WARNING below to inform a user when even
           * this fallback will not succeed, for example if the user only has 'data' node roles, and no `data_<tier>` node roles.
           */
          if (noTiersAvailable) {
            return (
              <>
                <EuiSpacer size="s" />
                <NoTiersAvailableUsingNodeAttributesNotice />
              </>
            );
          }

          /**
           * If we are able to fallback to a data tier that does not map to this phase, we show a notice informing the user that their
           * data will not be assigned to a corresponding tier.
           */
          if (willUseFallbackTier) {
            return (
              <>
                <EuiSpacer size="s" />
                <WillUseFallbackTierUsingNodeAttributesNotice
                  phase={phase}
                  targetNodeRole={allocationNodeRoleForPhase as DataTierRole}
                />
              </>
            );
          }

          /**
           * If using node roles, default allocation behavior will be to the preferred nodes, depending on the phase.
           */
          return (
            <>
              <EuiSpacer size="s" />
              <DefaultToDataTiersNotice phase={phase} />
            </>
          );
        }

        /**
         * Special Cloud case: when deprecated data role configuration is in use, it means that this deployment is not using
         * the new node role based allocation. We drive users to the cloud console to migrate to node role based allocation
         * in that case.
         */
        if (isCloudEnabled && isUsingDeprecatedDataRoleConfig) {
          return (
            <>
              <EuiSpacer size="s" />
              <CloudDataTierCallout linkToCloudDeployment={cloudDeploymentUrl} />
            </>
          );
        }
        break;
      default:
        return null;
    }
  };

  return (
    <EuiDescribedFormGroup
      title={<h3>{i18nTexts.editPolicy.dataAllocationLabel}</h3>}
      description={
        <>
          {description}
          {isLoading ? (
            <>
              <EuiSpacer size="m" />
              <EuiLoadingSpinner data-test-subj="allocationLoadingSpinner" size="xl" />
            </>
          ) : (
            error && (
              <LoadingError
                onResendRequest={resendRequest}
                message={error.message}
                statusCode={error.statusCode}
              />
            )
          )}
        </>
      }
      fullWidth
    >
      <div className="ilmDataTierAllocationField">
        <DataTierAllocation
          hasNodeAttributes={hasNodeAttributes}
          phase={phase}
          nodes={nodesByAttributes}
          isCloudEnabled={isCloudEnabled}
          isUsingDeprecatedDataRoleConfig={isUsingDeprecatedDataRoleConfig}
          isLoading={isLoading}
        />

        {/* Data tier related warnings and call-to-action notices */}
        {!isLoading && renderNotice()}
      </div>
    </EuiDescribedFormGroup>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { Routes, Route } from '@kbn/shared-ux-router';

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { FLEET_ROUTING_PATHS } from '../../constants';
import { Loading, Error } from '../../components';
import { useConfig, useFleetStatus, useBreadcrumbs, useAuthz, useFlyoutContext } from '../../hooks';
import { DefaultLayout, WithoutHeaderLayout } from '../../layouts';

import { AgentListPage } from './agent_list_page';
import { FleetServerRequirementPage, MissingESRequirementsPage } from './agent_requirements_page';
import { AgentDetailsPage } from './agent_details_page';
import { NoAccessPage } from './error_pages/no_access';

export const AgentsApp: React.FunctionComponent = () => {
  useBreadcrumbs('agent_list');
  const { agents } = useConfig();
  const authz = useAuthz();
  const fleetStatus = useFleetStatus();
  const flyoutContext = useFlyoutContext();

  if (!agents.enabled) return null;
  if (!fleetStatus.missingRequirements && fleetStatus.isLoading) {
    return <Loading />;
  }

  if (fleetStatus.error) {
    return (
      <WithoutHeaderLayout>
        <Error
          title={
            <FormattedMessage
              id="xpack.fleet.agentsInitializationErrorMessageTitle"
              defaultMessage="Unable to initialize central management for Elastic Agents"
            />
          }
          error={fleetStatus.error}
        />
      </WithoutHeaderLayout>
    );
  }

  const hasOnlyFleetServerMissingRequirement =
    fleetStatus?.missingRequirements?.length === 1 &&
    fleetStatus.missingRequirements[0] === 'fleet_server';

  const displayInstructions =
    authz.fleet.allAgents &&
    (fleetStatus.forceDisplayInstructions || hasOnlyFleetServerMissingRequirement);

  if (
    !hasOnlyFleetServerMissingRequirement &&
    fleetStatus.missingRequirements &&
    fleetStatus.missingRequirements.length > 0
  ) {
    return <MissingESRequirementsPage missingRequirements={fleetStatus.missingRequirements} />;
  }
  if (!authz.fleet.readAgents) {
    return <NoAccessPage />;
  }

  const rightColumn = displayInstructions ? (
    <>
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="plusInCircle"
            onClick={() => flyoutContext.openEnrollmentFlyout()}
            data-test-subj="addAgentBtnTop"
          >
            <FormattedMessage id="xpack.fleet.addAgentButton" defaultMessage="Add Agent" />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  ) : undefined;

  return (
    <Routes>
      <Route path={FLEET_ROUTING_PATHS.agent_details}>
        <AgentDetailsPage />
      </Route>
      <Route path={FLEET_ROUTING_PATHS.agents}>
        <DefaultLayout section="agents" rightColumn={rightColumn}>
          {displayInstructions ? (
            <FleetServerRequirementPage showEnrollmentRecommendation={false} />
          ) : (
            <AgentListPage />
          )}
        </DefaultLayout>
      </Route>
    </Routes>
  );
};

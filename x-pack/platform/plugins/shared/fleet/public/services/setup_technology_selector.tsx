/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiBetaBadge,
  EuiText,
  EuiRadioGroup,
  EuiDescribedFormGroup,
  EuiSpacer,
  EuiBadge,
  EuiTitle,
  EuiCallOut,
  EuiLink,
} from '@elastic/eui';

import { useStartServices } from '../hooks';
import { SetupTechnology } from '../../common/types';

export const SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ = 'setup-technology-selector';

interface SetupTechnologySelectorProps {
  disabled: boolean;
  onSetupTechnologyChange: (value: SetupTechnology) => void;
  allowedSetupTechnologies?: SetupTechnology[];
  setupTechnology?: SetupTechnology;
  isAgentlessDefault?: boolean;
  showBetaBadge?: boolean;
  showLimitationsMessage?: boolean;
  useDescribedFormGroup?: boolean;
}

export const SetupTechnologySelector = ({
  disabled,
  allowedSetupTechnologies = [SetupTechnology.AGENT_BASED, SetupTechnology.AGENTLESS],
  setupTechnology,
  onSetupTechnologyChange,
  isAgentlessDefault = false,
  showBetaBadge = true,
  showLimitationsMessage = false,
  useDescribedFormGroup = true,
}: SetupTechnologySelectorProps) => {
  const { docLinks } = useStartServices();

  const currentSetupTechnology =
    setupTechnology ||
    (isAgentlessDefault ? SetupTechnology.AGENTLESS : SetupTechnology.AGENT_BASED);

  const agentlessRadioId = `SetupTechnologySelector_${SetupTechnology.AGENTLESS}`;
  const agentBasedRadioId = `SetupTechnologySelector_${SetupTechnology.AGENT_BASED}`;

  const radioGroup = (
    <EuiRadioGroup
      disabled={disabled}
      name="SetupTechnologySelector"
      data-test-subj={SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ}
      idSelected={`SetupTechnologySelector_${currentSetupTechnology}`}
      options={[
        {
          id: agentlessRadioId,
          value: SetupTechnology.AGENTLESS,
          disabled: !allowedSetupTechnologies.includes(SetupTechnology.AGENTLESS),
          label: (
            <>
              <strong>
                <FormattedMessage
                  id="xpack.fleet.setupTechnology.agentlessInputDisplay"
                  defaultMessage="Agentless"
                />{' '}
                {isAgentlessDefault ? (
                  <EuiBadge>
                    <FormattedMessage
                      id="xpack.fleet.setupTechnology.agentlessDeployment.recommendedBadge"
                      defaultMessage="Recommended"
                    />
                  </EuiBadge>
                ) : (
                  showBetaBadge && (
                    <EuiBetaBadge
                      href={docLinks.links.fleet.agentlessIntegrations}
                      target="_blank"
                      label={
                        <FormattedMessage
                          id="xpack.fleet.setupTechnology.agentlessDeployment.betaBadge"
                          defaultMessage="Beta"
                        />
                      }
                      size="s"
                      tooltipContent={
                        <FormattedMessage
                          id="xpack.fleet.setupTechnology.agentlessDeployment.betaTooltip"
                          defaultMessage="This module is not yet GA. Please help us by reporting any bugs."
                        />
                      }
                      alignment="middle"
                    />
                  )
                )}
              </strong>
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.fleet.setupTechnology.agentlessInputDescription"
                    defaultMessage="Set up the integration without an agent"
                  />
                </p>
              </EuiText>
              <EuiSpacer size="xs" />
            </>
          ),
        },
        {
          id: agentBasedRadioId,
          value: SetupTechnology.AGENT_BASED,
          disabled: !allowedSetupTechnologies.includes(SetupTechnology.AGENT_BASED),
          label: (
            <>
              <strong>
                <FormattedMessage
                  id="xpack.fleet.setupTechnology.agentbasedInputDisplay"
                  defaultMessage="Agent-based"
                />
              </strong>
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.fleet.setupTechnology.agentbasedInputDescription"
                    defaultMessage="Deploy an Elastic Agent into your cloud environment"
                  />
                </p>
              </EuiText>
            </>
          ),
        },
      ]}
      onChange={(optionId: string, value?: unknown) => {
        const newSetupTechnology =
          (value as SetupTechnology) ??
          (optionId === agentlessRadioId ? SetupTechnology.AGENTLESS : SetupTechnology.AGENT_BASED);
        onSetupTechnologyChange(newSetupTechnology);
      }}
    />
  );

  const limitationsMessage = showLimitationsMessage && (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        color="warning"
        iconType="alert"
        size="s"
        title={
          <FormattedMessage
            id="xpack.fleet.setupTechnology.comingSoon"
            defaultMessage="Agentless deployment is not supported if you are using {link}."
            values={{
              link: (
                <EuiLink
                  href="https://www.elastic.co/guide/en/cloud-enterprise/current/ece-traffic-filtering-deployment-configuration.html"
                  target="_blank"
                >
                  <FormattedMessage
                    id="xpack.fleet.setupTechnology.comingSoon.trafficFilteringLinkText"
                    defaultMessage="Traffic filtering"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      />
      <EuiSpacer size="s" />
    </>
  );

  if (useDescribedFormGroup) {
    return (
      <EuiDescribedFormGroup
        title={
          <h3>
            <FormattedMessage
              id="xpack.fleet.setupTechnology.setupTechnologyLabel"
              defaultMessage="Deployment options"
            />
          </h3>
        }
        description={
          <>
            <FormattedMessage
              id="xpack.fleet.setupTechnology.setupTechnologyDescription"
              defaultMessage="Select a deployment mode for this integration."
            />
            {limitationsMessage}
          </>
        }
      >
        {radioGroup}
      </EuiDescribedFormGroup>
    );
  }

  // Used for security integrations (no form group wrapping)
  return (
    <>
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.fleet.setupTechnology.setupTechnologyLabel"
            defaultMessage="Deployment options"
          />
        </h2>
      </EuiTitle>
      {limitationsMessage || <EuiSpacer size="s" />}
      {radioGroup}
    </>
  );
};

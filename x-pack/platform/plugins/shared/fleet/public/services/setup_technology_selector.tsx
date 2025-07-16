/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

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
  useGeneratedHtmlId,
} from '@elastic/eui';

import { useStartServices } from '../hooks';
import { SetupTechnology } from '../../common/types';

export const SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ = 'setup-technology-selector';

interface SetupTechnologySelectorProps {
  disabled: boolean;
  onSetupTechnologyChange: (value: SetupTechnology) => void;
  // Fleet pattern props
  allowedSetupTechnologies?: SetupTechnology[];
  setupTechnology?: SetupTechnology;
  isAgentlessDefault?: boolean;
  // CSPM pattern props (for backward compatibility)
  isAgentless?: boolean;
  showLimitationsMessage?: boolean;
  // Style options
  useDescribedFormGroup?: boolean;
}

export const SetupTechnologySelector = ({
  disabled,
  allowedSetupTechnologies = [SetupTechnology.AGENT_BASED, SetupTechnology.AGENTLESS],
  setupTechnology,
  onSetupTechnologyChange,
  isAgentlessDefault = false,
  isAgentless,
  showLimitationsMessage = false,
  useDescribedFormGroup = true,
}: SetupTechnologySelectorProps) => {
  const { docLinks } = useStartServices();

  // Support both patterns - isAgentless (CSPM) and setupTechnology (Fleet)
  const currentSetupTechnology =
    setupTechnology ?? (isAgentless ? SetupTechnology.AGENTLESS : SetupTechnology.AGENT_BASED);

  const radioGroupItemId1 = useGeneratedHtmlId({
    prefix: 'radioGroupItem',
    suffix: 'agentless',
  });
  const radioGroupItemId2 = useGeneratedHtmlId({
    prefix: 'radioGroupItem',
    suffix: 'agentbased',
  });

  const [radioIdSelected, setRadioIdSelected] = useState(
    currentSetupTechnology === SetupTechnology.AGENTLESS ? radioGroupItemId1 : radioGroupItemId2
  );

  useEffect(() => {
    setRadioIdSelected(
      currentSetupTechnology === SetupTechnology.AGENTLESS ? radioGroupItemId1 : radioGroupItemId2
    );
  }, [currentSetupTechnology, radioGroupItemId1, radioGroupItemId2]);

  const onChange = (optionId: string, value?: any) => {
    const newSetupTechnology =
      value ??
      (optionId === radioGroupItemId1 ? SetupTechnology.AGENTLESS : SetupTechnology.AGENT_BASED);
    setRadioIdSelected(optionId);
    onSetupTechnologyChange(newSetupTechnology);
  };

  const limitationsMessage = showLimitationsMessage && (
    <FormattedMessage
      id="xpack.csp.setupTechnologySelector.comingSoon"
      defaultMessage="Agentless deployment is not supported if you are using {link}."
      values={{
        link: (
          <EuiLink
            href="https://www.elastic.co/guide/en/cloud-enterprise/current/ece-traffic-filtering-deployment-configuration.html"
            target="_blank"
          >
            Traffic filtering
          </EuiLink>
        ),
      }}
    />
  );

  const radioOptions = [
    {
      id: useDescribedFormGroup
        ? `SetupTechnologySelector_${SetupTechnology.AGENTLESS}`
        : radioGroupItemId1,
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
              <EuiBetaBadge
                href={docLinks.links.fleet.agentlessIntegrations}
                target="_blank"
                label={'Beta'}
                size="s"
                tooltipContent="This module is not yet GA. Please help us by reporting any bugs."
                alignment="middle"
              />
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
      id: useDescribedFormGroup
        ? `SetupTechnologySelector_${SetupTechnology.AGENT_BASED}`
        : radioGroupItemId2,
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
  ];

  const radioGroup = (
    <EuiRadioGroup
      disabled={disabled}
      name={useDescribedFormGroup ? 'SetupTechnologySelector' : 'radio group'}
      data-test-subj={SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ}
      options={radioOptions}
      idSelected={
        useDescribedFormGroup
          ? `SetupTechnologySelector_${currentSetupTechnology}`
          : radioIdSelected
      }
      onChange={onChange}
    />
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
          <FormattedMessage
            id="xpack.fleet.setupTechnology.setupTechnologyDescription"
            defaultMessage="Select a deployment mode for this integration."
          />
        }
      >
        {radioGroup}
      </EuiDescribedFormGroup>
    );
  }

  // CSMP style layout
  return (
    <>
      <EuiSpacer size="l" />
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.csp.setupTechnologySelector.deploymentOptionsTitle"
            defaultMessage="Deployment options"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      {limitationsMessage && (
        <EuiCallOut title={limitationsMessage} color="warning" iconType="alert" size="m" />
      )}
      <EuiSpacer size="m" />
      {radioGroup}
    </>
  );
};

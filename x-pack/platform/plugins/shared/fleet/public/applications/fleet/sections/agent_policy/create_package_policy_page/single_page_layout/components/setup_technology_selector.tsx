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
} from '@elastic/eui';

import { SetupTechnology } from '../../../../../types';

export const SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ = 'setup-technology-selector';

export const SetupTechnologySelector = ({
  disabled,
  allowedSetupTechnologies,
  setupTechnology,
  onSetupTechnologyChange,
}: {
  disabled: boolean;
  allowedSetupTechnologies: SetupTechnology[];
  setupTechnology: SetupTechnology;
  onSetupTechnologyChange: (value: SetupTechnology) => void;
}) => {
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
      <EuiRadioGroup
        disabled={disabled}
        name="SetupTechnologySelector"
        data-test-subj={SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ}
        options={[
          {
            id: `SetupTechnologySelector_${SetupTechnology.AGENTLESS}`,
            value: SetupTechnology.AGENTLESS,
            disabled: !allowedSetupTechnologies.includes(SetupTechnology.AGENTLESS),
            label: (
              <>
                <strong>
                  <FormattedMessage
                    id="xpack.fleet.setupTechnology.agentlessInputDisplay"
                    defaultMessage="Agentless"
                  />{' '}
                  <EuiBetaBadge
                    label="Beta"
                    size="s"
                    tooltipContent="This module is not yet GA. Please help us by reporting any bugs."
                    alignment="middle"
                  />
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
            id: `SetupTechnologySelector_${SetupTechnology.AGENT_BASED}`,
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
        idSelected={`SetupTechnologySelector_${setupTechnology}`}
        onChange={(id, value) => {
          onSetupTechnologyChange(value as SetupTechnology);
        }}
      />
    </EuiDescribedFormGroup>
  );
};

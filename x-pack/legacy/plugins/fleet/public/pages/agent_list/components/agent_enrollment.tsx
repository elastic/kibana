/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, Fragment } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiFilterGroup,
  EuiFilterButton,
} from '@elastic/eui';
import { Policy } from '../../../../scripts/mock_spec/types';
import { useLibs } from '../../../hooks/use_libs';
import {
  ShellEnrollmentInstructions,
  ContainerEnrollmentInstructions,
  ToolsEnrollmentInstructions,
} from './enrollment_instructions';

interface RouterProps {
  onClose: () => void;
  policies: Policy[];
}

export const AgentEnrollmentFlyout: React.SFC<RouterProps> = ({ onClose, policies }) => {
  const libs = useLibs();
  const [selectedPolicy, setSelectedPolicy] = useState('');
  const [quickInstallType, setQuickInstallType] = useState<'shell' | 'container' | 'tools'>(
    'shell'
  );

  const renderHeader = () => (
    <EuiFlyoutHeader hasBorder aria-labelledby="FleetAgentEnrollmentFlyoutTitle">
      <EuiTitle size="m">
        <h2 id="FleetAgentEnrollmentFlyoutTitle">
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.flyoutTitle"
            defaultMessage="Install agent"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText color="subdued">
        <p>
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.flyoutDescription"
            defaultMessage="Enroll a new agent into Fleet."
          />
        </p>
      </EuiText>
    </EuiFlyoutHeader>
  );

  const renderInstructions = () => (
    <Fragment>
      <EuiText>
        <h5>
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.enrollIntoSelectionTitle"
            defaultMessage="Enroll into policy:"
          />
        </h5>
      </EuiText>
      <EuiSuperSelect
        options={policies.map(p => ({ value: p.id, inputDisplay: p.name }))}
        valueOfSelected={selectedPolicy || ''}
        onChange={value => setSelectedPolicy(value)}
      />
      <EuiSpacer size="s" />

      <EuiText>
        <h5>
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.quickInstallTitle"
            defaultMessage="Quick installation"
          />
        </h5>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFilterGroup>
        <EuiFilterButton
          hasActiveFilters={quickInstallType === 'shell'}
          onClick={() => setQuickInstallType('shell')}
        >
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.shellInstallButtonText"
            defaultMessage="Shell"
          />
        </EuiFilterButton>
        <EuiFilterButton
          hasActiveFilters={quickInstallType === 'container'}
          onClick={() => setQuickInstallType('container')}
        >
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.containerInstallButtonText"
            defaultMessage="Container"
          />
        </EuiFilterButton>
        <EuiFilterButton
          hasActiveFilters={quickInstallType === 'tools'}
          onClick={() => setQuickInstallType('tools')}
        >
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.toolsInstallButtonText"
            defaultMessage="Tools"
          />
        </EuiFilterButton>
      </EuiFilterGroup>
      <EuiSpacer size="m" />
      {quickInstallType === 'shell' ? (
        <ShellEnrollmentInstructions
          kibanaUrl={`${window.location.origin}${libs.framework.info.basePath}`}
        />
      ) : null}
      {quickInstallType === 'container' ? <ContainerEnrollmentInstructions /> : null}
      {quickInstallType === 'tools' ? <ToolsEnrollmentInstructions /> : null}
    </Fragment>
  );

  const renderBody = () => <EuiFlyoutBody>{renderInstructions()}</EuiFlyoutBody>;

  const renderFooter = () => (
    <EuiFlyoutFooter>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
            Close
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton fill onClick={onClose}>
            Continue
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlyoutFooter>
  );

  return (
    <EuiFlyout onClose={onClose} size="m" maxWidth={650}>
      {renderHeader()}
      {renderBody()}
      {renderFooter()}
    </EuiFlyout>
  );
};

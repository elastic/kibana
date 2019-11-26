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
  EuiText,
  EuiFilterGroup,
  EuiFilterButton,
  EuiSelect,
  EuiHorizontalRule,
} from '@elastic/eui';
import {
  ShellEnrollmentInstructions,
  ContainerEnrollmentInstructions,
  ToolsEnrollmentInstructions,
} from './enrollment_instructions';
import { useLibs } from '../../../hooks/use_libs';
import { useEnrollmentApiKeys, useEnrollmentApiKey } from './enrollment_api_keys/hooks';
import { EnrollmentApiKeysTable } from './enrollment_api_keys';

interface RouterProps {
  onClose: () => void;
}

export const AgentEnrollmentFlyout: React.SFC<RouterProps> = ({ onClose }) => {
  const libs = useLibs();
  const [quickInstallType, setQuickInstallType] = useState<'shell' | 'container' | 'tools'>(
    'shell'
  );
  // api keys
  const enrollmentApiKeys = useEnrollmentApiKeys({
    currentPage: 1,
    pageSize: 1000,
  });
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null);
  React.useEffect(() => {
    if (!selectedApiKeyId && enrollmentApiKeys.data && enrollmentApiKeys.data.list.length > 0) {
      setSelectedApiKeyId(enrollmentApiKeys.data.list[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollmentApiKeys.data]);
  const apiKey = useEnrollmentApiKey(selectedApiKeyId);

  const header = (
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

  const policyOptions = enrollmentApiKeys.data
    ? enrollmentApiKeys.data.list.map(key => ({
        value: key.id,
        text: key.name,
      }))
    : [];

  const [apiKeyListVisible, setApiKeyListVisble] = useState(false);
  const renderedPolicySelect = (
    <>
      <EuiText>
        <h5>
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.selectPolicyTitle"
            defaultMessage="Select Policy"
          />
        </h5>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiSelect
        options={policyOptions}
        value={selectedApiKeyId || undefined}
        onChange={e => setSelectedApiKeyId(e.target.value)}
      />
      <EuiSpacer size="m" />
      <EuiButtonEmpty
        color="text"
        onClick={() => {
          setApiKeyListVisble(!apiKeyListVisible);
        }}
        iconType={apiKeyListVisible ? 'arrowUp' : 'arrowDown'}
        iconSide="right"
        size="xs"
        flush="left"
      >
        {apiKeyListVisible ? (
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.hideKeysButton"
            defaultMessage="Hide ApiKeys"
          />
        ) : (
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.viewKeysButton"
            defaultMessage="View ApiKeys"
          />
        )}
      </EuiButtonEmpty>
      {apiKeyListVisible && (
        <>
          <EuiSpacer size="m" />
          <EnrollmentApiKeysTable />
        </>
      )}
    </>
  );

  const renderedInstructions = apiKey.data && (
    <Fragment>
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
          apiKey={apiKey.data.item}
          kibanaUrl={`${window.location.origin}${libs.framework.info.basePath}`}
        />
      ) : null}
      {quickInstallType === 'container' ? <ContainerEnrollmentInstructions /> : null}
      {quickInstallType === 'tools' ? <ToolsEnrollmentInstructions /> : null}
    </Fragment>
  );

  const body = (
    <EuiFlyoutBody>
      {renderedPolicySelect}
      <EuiHorizontalRule />
      <EuiSpacer size="l" />
      {renderedInstructions}
    </EuiFlyoutBody>
  );

  const footer = (
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
    <EuiFlyout onClose={onClose} size="l" maxWidth={950}>
      {header}
      {body}
      {footer}
    </EuiFlyout>
  );
};

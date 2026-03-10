/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useQuery } from '@kbn/react-query';

import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiButton,
  EuiText,
  EuiSteps,
  EuiCodeBlock,
  EuiSpacer,
  EuiLoadingSpinner,
  EuiFlyoutFooter,
  EuiCallOut,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';

import {
  sendGetOneAgentPolicy,
  sendCreateAgentPolicyForRq,
  sendGetEnrollmentAPIKeys,
  useGetFleetServerHosts,
  useFleetStatus,
} from '../../../../hooks';
import { AgentEnrollmentConfirmationStep, usePollingAgentCount } from '../../../../components';

interface AddCollectorFlyoutProps {
  onClose: () => void;
  onClickViewAgents: () => void;
}

const OPAMP_POLICY_ID = 'opamp';
export const OPAMP_POLICY_NAME = 'OpAMP';

function getOpAMPPolicyId(spaceId?: string) {
  return !spaceId || spaceId === '' || spaceId === DEFAULT_SPACE_ID
    ? OPAMP_POLICY_ID
    : `${spaceId}-${OPAMP_POLICY_ID}`;
}

async function fetchOpampPolicy(spaceId?: string): Promise<any | null> {
  const res = await sendGetOneAgentPolicy(getOpAMPPolicyId(spaceId));
  if (res?.error?.statusCode === 404) {
    return null;
  }
  if (res?.error?.message) {
    throw new Error(res.error.message);
  }
  return res?.data?.item || null;
}

async function createOpampPolicyWithHook(spaceId?: string): Promise<any> {
  return sendCreateAgentPolicyForRq({
    name: OPAMP_POLICY_NAME,
    id: getOpAMPPolicyId(spaceId),
    namespace: 'default',
    description: 'Agent policy for OpAMP collectors',
    is_managed: true,
  });
}

async function fetchEnrollmentTokenWithHook(policyId: string): Promise<any[]> {
  const res = await sendGetEnrollmentAPIKeys({
    page: 1,
    perPage: 1,
    kuery: `policy_id:"${policyId}"`,
  });
  if (res?.error?.message) {
    throw new Error(res.error.message);
  }
  return res?.data?.items || [];
}

async function ensurePolicyAndFetchToken(spaceId?: string): Promise<string | undefined> {
  let opampPolicy = await fetchOpampPolicy(spaceId);
  if (!opampPolicy) {
    const created = await createOpampPolicyWithHook(spaceId);
    opampPolicy = created.item || created;
  }
  const tokens = await fetchEnrollmentTokenWithHook(opampPolicy.id);
  return tokens[0]?.api_key;
}

export const AddCollectorFlyout: React.FunctionComponent<AddCollectorFlyoutProps> = ({
  onClose,
  onClickViewAgents,
}) => {
  const fleetServerHosts = useGetFleetServerHosts();
  const defaultFleetServerHost =
    fleetServerHosts.data?.items?.find((item) => item.is_default)?.host_urls?.[0] || '';
  const { spaceId } = useFleetStatus();
  const { enrolledAgentIds } = usePollingAgentCount(getOpAMPPolicyId(spaceId), {
    noLowerTimeLimit: true,
    pollImmediately: true,
  });

  const {
    data: token,
    isLoading: loading,
    error: queryError,
  } = useQuery<string | undefined, Error>({
    queryKey: ['opampPolicyAndToken'],
    queryFn: () => ensurePolicyAndFetchToken(spaceId),
  });

  const error = queryError?.message ?? null;

  const opampConfig = `extensions:
  opamp:
    server:
      http:
        endpoint: ${defaultFleetServerHost}/v1/opamp
        headers:
          Authorization: ApiKey ${token}
    instance_uid: <instance-uid>

service:
  extensions: [opamp]`;

  const steps = [
    {
      title: i18n.translate('xpack.fleet.addCollectorFlyout.getOpampConfigStepTitle', {
        defaultMessage: 'Copy OpAMP Configuration',
      }),
      children: (
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.fleet.addCollectorFlyout.opampConfigInstruction"
              defaultMessage="Use this OpAMP configuration to monitor your collector:"
            />
          </p>
          {token && defaultFleetServerHost ? (
            <EuiCodeBlock
              isCopyable
              language="yaml"
              paddingSize="m"
              data-test-subj="opampConfigYaml"
            >
              {opampConfig}
            </EuiCodeBlock>
          ) : loading ? (
            <EuiCallOut
              announceOnMount
              size="m"
              color="primary"
              iconType={EuiLoadingSpinner}
              title={
                <FormattedMessage
                  id="xpack.fleet.agentEnrollment.loading.preparingOpAMPConfig"
                  defaultMessage="Preparing OpAMP configuration..."
                />
              }
            />
          ) : null}
        </EuiText>
      ),
    },
    {
      title: i18n.translate('xpack.fleet.addCollectorFlyout.runCollectorStepTitle', {
        defaultMessage: 'Run your collector',
      }),
      children: (
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.fleet.addCollectorFlyout.runCollectorInstruction"
              defaultMessage="Run your collector. The following command uses the OTel contrib collector:"
            />
          </p>
          <EuiCodeBlock isCopyable language="yaml" paddingSize="m">
            {'./otelcol-contrib --config ./otel-opamp.yaml '}
          </EuiCodeBlock>
        </EuiText>
      ),
    },
    AgentEnrollmentConfirmationStep({
      selectedPolicyId: getOpAMPPolicyId(spaceId),
      onClickViewAgents,
      troubleshootLink: '', // TODO: add troubleshooting guide link
      agentCount: enrolledAgentIds.length,
      isCollector: true,
    }) as any,
  ];

  return (
    <EuiFlyout onClose={onClose} size="m" aria-labelledby="addCollectorFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="addCollectorFlyoutTitle">
            {' '}
            <FormattedMessage
              id="xpack.fleet.addCollectorFlyout.title"
              defaultMessage="Add Collector"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.addCollectorFlyout.description"
            defaultMessage="Monitor OpenTelemetry collectors in Fleet with OpAMP."
          />
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {error ? (
          <EuiText color="danger">
            <p>{error}</p>
          </EuiText>
        ) : (
          <EuiSteps steps={steps} firstStepNumber={1} />
        )}
        <EuiSpacer size="l" />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton onClick={onClose} style={{ marginTop: 16 }}>
          <FormattedMessage
            id="xpack.fleet.addCollectorFlyout.closeButton"
            defaultMessage="Close"
          />
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

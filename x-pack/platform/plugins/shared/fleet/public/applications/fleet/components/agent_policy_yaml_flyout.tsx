/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiCallOut,
  EuiIconTip,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { MAX_FLYOUT_WIDTH } from '../constants';
import { useGetOneAgentPolicyFull, useGetOneAgentPolicy, useStartServices } from '../hooks';

import { agentPolicyRouteService, getYamlFormatters } from '../services';
import type { YamlFormatters } from '../../../services/yaml_formatters';
import { API_VERSIONS } from '../../../../common/constants';
import { splitVersionSuffixFromPolicyId } from '../../../../common/services/version_specific_policies_utils';

import { Loading } from '.';

const FlyoutBody = styled(EuiFlyoutBody)`
  .euiFlyoutBody__overflowContent {
    padding: 0;
  }
`;

export const AgentPolicyYamlFlyout = memo<{
  policyId: string;
  revision?: number | null;
  onClose: () => void;
}>(({ policyId, revision, onClose }) => {
  const flyoutTitleId = useGeneratedHtmlId();
  const { version: agentVersion } = splitVersionSuffixFromPolicyId(policyId);
  const [formatters, setFormatters] = useState<YamlFormatters | null>(null);

  useEffect(() => {
    getYamlFormatters().then(setFormatters);
  }, []);

  const core = useStartServices();
  const {
    isLoading: isLoadingYaml,
    data: yamlData,
    error,
  } = useGetOneAgentPolicyFull(policyId, revision ? { revision } : undefined);
  const { data: agentPolicyData } = useGetOneAgentPolicy(policyId);
  const packagePoliciesContainSecrets = agentPolicyData?.item?.package_policies?.some(
    (packagePolicy) => packagePolicy?.secret_references?.length
  );

  const body =
    isLoadingYaml || !formatters ? (
      <Loading />
    ) : error ? (
      <EuiCallOut
        announceOnMount
        title={
          <FormattedMessage
            id="xpack.fleet.policyDetails.errorGettingFullAgentPolicy"
            defaultMessage="Error loading agent policy yaml"
          />
        }
        color="danger"
        iconType="warning"
      >
        {error.message}
      </EuiCallOut>
    ) : (
      <EuiCodeBlock language="yaml" isCopyable fontSize="m" whiteSpace="pre">
        {formatters.fullAgentPolicyToYaml(yamlData!.item)}
      </EuiCodeBlock>
    );

  const revisionQueryParam = revision ? `&revision=${revision}` : '';
  const downloadLink =
    core.http.basePath.prepend(agentPolicyRouteService.getInfoFullDownloadPath(policyId)) +
    `?apiVersion=${API_VERSIONS.public.v1}${revisionQueryParam}`;

  const downloadYaml = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!yamlData?.item || !formatters) {
        return;
      }
      const yamlStr = formatters.fullAgentPolicyToYaml(yamlData.item);
      const link = document.createElement('a');
      link.href = `data:text/x-yaml;charset=utf-8,${encodeURIComponent(yamlStr)}`;
      link.download = 'elastic-agent.yml';
      link.click();
    },
    [yamlData, formatters]
  );

  return (
    <EuiFlyout onClose={onClose} maxWidth={MAX_FLYOUT_WIDTH} aria-labelledby={flyoutTitleId}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={flyoutTitleId}>
            {agentPolicyData?.item ? (
              <>
                <FormattedMessage
                  id="xpack.fleet.policyDetails.yamlflyoutTitleWithName"
                  defaultMessage="''{name}'' agent policy{revisionLabel}{versionLabel}"
                  values={{
                    name: agentPolicyData.item.name,
                    revisionLabel: revision ? ` (rev. ${revision})` : '',
                    versionLabel: agentVersion ? ` - v${agentVersion}` : '',
                  }}
                />
                {agentVersion && (
                  <>
                    {' '}
                    <EuiIconTip
                      type="branch"
                      size="m"
                      color="subdued"
                      content={
                        <FormattedMessage
                          id="xpack.fleet.agentPolicyYamlFlyout.versionSpecificPolicyTooltip"
                          defaultMessage="This agent uses a version-specific policy because some integrations have agent version requirements."
                        />
                      }
                    />
                  </>
                )}
              </>
            ) : (
              <FormattedMessage
                id="xpack.fleet.policyDetails.yamlflyoutTitleWithoutName"
                defaultMessage="Agent policy"
              />
            )}
          </h2>
        </EuiTitle>
        {packagePoliciesContainSecrets && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              title={
                <FormattedMessage
                  id="xpack.fleet.policyDetails.secretsTitle"
                  defaultMessage="This policy contains secret values"
                />
              }
              size="m"
              color="primary"
              iconType="info"
            >
              <FormattedMessage
                id="xpack.fleet.policyDetails.secretsDescription"
                defaultMessage="Kibana does not have access to secret values. You will need to set these values manually after deploying the agent policy. Look out for environment variables in the format {envVarPrefix} in the agent configuration."
                values={{
                  envVarPrefix: <code>{'${SECRET_0}'}</code>,
                }}
              />
            </EuiCallOut>
          </>
        )}
      </EuiFlyoutHeader>
      <FlyoutBody>{body}</FlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.fleet.policyDetails.yamlFlyoutCloseButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
            <EuiButton
              href={downloadLink}
              iconType="download"
              onClick={downloadYaml}
              isDisabled={Boolean(isLoadingYaml || !yamlData || !formatters)}
            >
              <FormattedMessage
                id="xpack.fleet.policyDetails.yamlDownloadButtonLabel"
                defaultMessage="Download policy"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
});

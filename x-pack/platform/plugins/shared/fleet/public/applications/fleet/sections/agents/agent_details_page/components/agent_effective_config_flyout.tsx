/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { dump } from 'js-yaml';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';

import type { Agent } from '../../../../types';
import { MAX_FLYOUT_WIDTH } from '../../../../constants';
import { useGetAgentEffectiveConfigQuery } from '../../../../hooks';

export const AgentEffectiveConfigFlyout = memo<{ agent: Agent; onClose: () => void }>(
  ({ agent, onClose }) => {
    const { data: agentData, isLoading } = useGetAgentEffectiveConfigQuery(agent.id);
    const agentName =
      typeof agent.local_metadata?.host?.hostname === 'string'
        ? agent.local_metadata.host.hostname
        : agent.id;

    const flyoutTitleId = useGeneratedHtmlId();

    const effectiveConfigYaml = useMemo(() => {
      if (agentData?.effective_config) {
        return dump(agentData.effective_config, { noRefs: true });
      }

      return '';
    }, [agentData?.effective_config]);

    const downloadFile = () => {
      const link = document.createElement('a');
      link.href = `data:text/yaml;charset=utf-8,${encodeURIComponent(effectiveConfigYaml)}`;
      link.download = `${agentName}-effective-config.yaml`;
      link.click();
    };

    return (
      <EuiFlyout onClose={onClose} maxWidth={MAX_FLYOUT_WIDTH} aria-labelledby={flyoutTitleId}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={flyoutTitleId}>
              <FormattedMessage
                id="xpack.fleet.agentDetails.effectiveConfigFlyoutTitle"
                defaultMessage="''{name}'' effective configuration"
                values={{
                  name: agentName,
                }}
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {isLoading ? (
            <EuiLoadingSpinner />
          ) : (
            <EuiCodeBlock language="yaml" isCopyable>
              {effectiveConfigYaml}
            </EuiCodeBlock>
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} flush="left">
                <FormattedMessage
                  id="xpack.fleet.agentDetails.effectiveConfigFlyoutCloseButtonLabel"
                  defaultMessage="Close"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton iconType="download" onClick={downloadFile} isLoading={isLoading}>
                <FormattedMessage
                  id="xpack.fleet.agentDetails.effectiveConfigFlyoutDownloadButtonLabel"
                  defaultMessage="Download Configuration"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);

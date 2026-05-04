/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlyout } from '@elastic/eui';
import type { FlowNode } from '@kbn/streams-plugin/common';
import { PanelAgent } from './panel_agent';
import { PanelAgentPolicy } from './panel_agent_policy';
import { PanelAgentless } from './panel_agentless';
import { PanelPrometheus } from './panel_prometheus';
import { PanelCloudPipeline } from './panel_cloud_pipeline';
import { PanelBulkEndpoint } from './panel_bulk_endpoint';
import { PanelWiredStream } from './panel_wired_stream';
import { PanelClassicStream } from './panel_classic_stream';

interface DetailFlyoutProps {
  node: FlowNode | null;
  onClose: () => void;
}

const PanelBody: React.FC<{ node: FlowNode; onClose: () => void }> = ({ node, onClose }) => {
  switch (node.kind) {
    case 'agent':
      return <PanelAgent node={node} onClose={onClose} />;
    case 'agentPolicy':
      return <PanelAgentPolicy node={node} onClose={onClose} />;
    case 'agentlessIntegration':
      return <PanelAgentless node={node} onClose={onClose} />;
    case 'prometheusScraper':
      return <PanelPrometheus node={node} onClose={onClose} />;
    case 'cloudPipeline':
      return <PanelCloudPipeline node={node} onClose={onClose} />;
    case 'bulkEndpoint':
      return <PanelBulkEndpoint node={node} onClose={onClose} />;
    case 'wiredStream':
      return <PanelWiredStream node={node} onClose={onClose} />;
    case 'classicStream':
      return <PanelClassicStream node={node} onClose={onClose} />;
    default:
      return null;
  }
};

export const DetailFlyout: React.FC<DetailFlyoutProps> = ({ node, onClose }) => {
  if (!node) return null;

  return (
    <EuiFlyout type="push" size="m" onClose={onClose} aria-labelledby="detail-flyout-title">
      <PanelBody node={node} onClose={onClose} />
    </EuiFlyout>
  );
};

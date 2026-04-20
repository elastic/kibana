/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { EuiLoadingSpinner, EuiPanel, EuiText, EuiIcon } from '@elastic/eui';
import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import type {
  VersionedAttachment,
  VisualizationAttachmentData,
} from '@kbn/agent-builder-common/attachments';
import type { A2UIComponent } from '@kbn/agent-builder-common/attachments';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useConversation } from '../../../hooks/use_conversation';

const LazyVisualizeLens = React.lazy(() =>
  import('../../tools/esql/visualize_lens').then((m) => ({ default: m.VisualizeLens }))
);

const resolveVisualizationAttachment = (
  attachmentId: string,
  version: number | undefined,
  conversationAttachments: VersionedAttachment[] | undefined
): VisualizationAttachmentData | undefined => {
  const attachment = conversationAttachments?.find(
    (att) => att.id === attachmentId && att.type === AttachmentType.visualization
  );

  if (!attachment) {
    return undefined;
  }

  const versionData =
    version !== undefined
      ? attachment.versions.find((v) => v.version === version)
      : attachment.versions.at(-1);

  return versionData?.data as VisualizationAttachmentData | undefined;
};

interface VisualizationRefRendererProps {
  component: A2UIComponent;
}

const VisualizationRefPlaceholder: React.FC<{ attachmentId: string; version?: number }> = ({
  attachmentId,
  version,
}) => (
  <EuiPanel hasBorder paddingSize="m" color="subdued">
    <EuiText size="xs" color="subdued">
      <EuiIcon type="lensApp" size="s" aria-hidden={true} /> Visualization: {attachmentId}
      {version !== undefined ? ` (v${version})` : ''}
    </EuiText>
  </EuiPanel>
);

export const VisualizationRefRenderer: React.FC<VisualizationRefRendererProps> = ({
  component,
}) => {
  const { startDependencies } = useAgentBuilderServices();
  const { conversation } = useConversation();

  const attachmentId = component.attachment_id;
  if (!attachmentId) {
    return <VisualizationRefPlaceholder attachmentId="unknown" />;
  }

  const vizData = resolveVisualizationAttachment(
    attachmentId,
    component.version as number | undefined,
    conversation?.attachments
  );

  if (!vizData) {
    return (
      <VisualizationRefPlaceholder
        attachmentId={attachmentId}
        version={component.version as number | undefined}
      />
    );
  }

  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <LazyVisualizeLens
        lensConfig={vizData.visualization}
        dataViews={startDependencies.dataViews}
        lens={startDependencies.lens}
        uiActions={startDependencies.uiActions}
        timeRange={vizData.time_range}
      />
    </Suspense>
  );
};

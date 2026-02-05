/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AttachmentContentProps } from '@kbn/agent-builder-browser/attachments';
import type { AgentBuilderStartDependencies } from '../../../types';
import { VisualizeLens } from '../tools/esql/visualize_lens';

interface VisualizationAttachmentData {
  visualization?: Record<string, unknown>;
}

export const createVisualizationAttachmentRenderer = (
  startDependencies: AgentBuilderStartDependencies
) => {
  return ({ version }: AttachmentContentProps) => {
    const data = version.data as VisualizationAttachmentData | undefined;
    if (!data?.visualization) {
      return (
        <EuiText>
          {i18n.translate('xpack.agentBuilder.visualizationAttachment.missingConfig', {
            defaultMessage: 'Visualization attachment missing configuration.',
          })}
        </EuiText>
      );
    }

    const timeRange = startDependencies.data.query.timefilter.timefilter.getTime();
    const searchSessionId = startDependencies.data.search.session.start();

    return (
      <VisualizeLens
        lensConfig={data.visualization}
        dataViews={startDependencies.dataViews}
        lens={startDependencies.lens}
        uiActions={startDependencies.uiActions}
        timeRange={timeRange}
        searchSessionId={searchSessionId}
      />
    );
  };
};

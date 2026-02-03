/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { ActionsMenuGroup, type PublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  streamsGetStreamStepCommonDefinition,
  StreamsGetStreamStepTypeId,
} from '../../common/workflow_steps';

export const streamsGetStreamStepDefinition: PublicStepDefinition = {
  ...streamsGetStreamStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/document').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.translate('xpack.streams.streamsGetStreamStep.label', {
    defaultMessage: 'Get Stream',
  }),
  description: i18n.translate('xpack.streams.streamsGetStreamStep.description', {
    defaultMessage: 'Retrieve details of a specific stream by name',
  }),
  actionsMenuGroup: ActionsMenuGroup.kibana,
  documentation: {
    details: i18n.translate('xpack.streams.streamsGetStreamStep.documentation.details', {
      defaultMessage: `The ${StreamsGetStreamStepTypeId} step retrieves a specific stream definition including its features and associated dashboards. Use {nameSyntax} to specify the stream name. The stream data is accessible via {outputSyntax}.`,
      values: {
        nameSyntax: '`name`',
        outputSyntax: '`{{ steps.stepName.output.stream }}`',
      },
    }),
    examples: [
      `## Get a specific stream
\`\`\`yaml
- name: fetch-logs-stream
  type: ${StreamsGetStreamStepTypeId}
  with:
    name: "logs"

# Access stream properties in subsequent steps
- name: log-stream-info
  type: log
  with:
    message: "Stream name: \${{ steps.fetch-logs-stream.output.stream.name }}"
\`\`\``,

      `## Get stream from dynamic input
\`\`\`yaml
- name: get-dynamic-stream
  type: ${StreamsGetStreamStepTypeId}
  with:
    name: "\${{ inputs.streamName }}"
\`\`\``,
    ],
  },
};

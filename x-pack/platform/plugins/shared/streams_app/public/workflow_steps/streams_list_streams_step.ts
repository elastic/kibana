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
  streamsListStreamsStepCommonDefinition,
  StreamsListStreamsStepTypeId,
} from '../../common/workflow_steps';

export const streamsListStreamsStepDefinition: PublicStepDefinition = {
  ...streamsListStreamsStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/list').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.translate('xpack.streams.streamsListStreamsStep.label', {
    defaultMessage: 'List Streams',
  }),
  description: i18n.translate('xpack.streams.streamsListStreamsStep.description', {
    defaultMessage: 'Retrieve a list of all available stream definitions',
  }),
  actionsMenuGroup: ActionsMenuGroup.kibana,
  documentation: {
    details: i18n.translate('xpack.streams.streamsListStreamsStep.documentation.details', {
      defaultMessage: `The ${StreamsListStreamsStepTypeId} step retrieves all stream definitions from the Streams API. The output contains an array of stream definitions accessible via {outputSyntax}.`,
      values: {
        outputSyntax: '`{{ steps.stepName.output.streams }}`',
      },
    }),
    examples: [
      `## List all streams
\`\`\`yaml
- name: get-all-streams
  type: ${StreamsListStreamsStepTypeId}

# Access the streams array in subsequent steps
- name: log-stream-count
  type: log
  with:
    message: "Found \${{ steps.get-all-streams.output.streams | size }} streams"
\`\`\``,
    ],
  },
};

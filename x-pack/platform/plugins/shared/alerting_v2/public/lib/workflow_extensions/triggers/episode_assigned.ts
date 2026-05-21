/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import {
  EPISODE_ASSIGNED_TRIGGER_ID,
  episodeAssignedTriggerCommonDefinition,
} from '../../../../common/workflows/triggers';

const EpisodeAssignedIcon = () => React.createElement(EuiIcon, { type: 'user' });

export const episodeAssignedTriggerPublicDefinition: PublicTriggerDefinition = {
  ...episodeAssignedTriggerCommonDefinition,
  icon: EpisodeAssignedIcon,
  title: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeAssigned.title', {
    defaultMessage: 'Alerting - Episode assigned',
  }),
  description: i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeAssigned.description', {
    defaultMessage: 'Emitted when an alerting episode is assigned to a user.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.alertingVTwo.workflowTriggers.episodeAssigned.documentation.details',
      {
        defaultMessage:
          'Emitted after an episode assign action is persisted with a non-null assignee. The payload includes event.episodeId, event.ruleId, event.spaceId, and event.assigneeUid for trigger conditions.',
      }
    ),
    examples: [
      i18n.translate('xpack.alertingVTwo.workflowTriggers.episodeAssigned.documentation.example', {
        defaultMessage: `## Run for a specific rule
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.ruleId: "my-rule-id"'
\`\`\``,
        values: {
          triggerId: EPISODE_ASSIGNED_TRIGGER_ID,
        },
      }),
    ],
  },
  snippets: {
    condition: 'event.assigneeUid: "user-profile-uid"',
  },
};

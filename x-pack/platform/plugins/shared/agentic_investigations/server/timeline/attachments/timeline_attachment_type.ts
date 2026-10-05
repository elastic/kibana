/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TIMELINE_ATTACHMENT_TYPE } from '../../../common/timeline/constants';
import {
  investigationTimelineSchema,
  sortTimelineEvents,
  type InvestigationTimeline,
  type TimelineEvent,
} from '../../../common/timeline/timeline';
import {
  defineInvestigationAttachment,
  formatEvidenceForAgent,
} from '../../investigation_attachments';
import {
  timelineStorageSettings,
  type TimelineDocument,
  type TimelineStorageSettings,
} from '../storage/timeline_storage';

const indent = (text: string): string =>
  text
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

const formatEvent = ({
  timestamp,
  end_timestamp: end,
  title,
  type,
  entity,
  evidence,
}: TimelineEvent) =>
  [
    `- ${timestamp}${end ? ` to ${end}` : ''} [${type}]${entity ? ` ${entity}:` : ''} ${title}`,
    evidence ? `  Evidence:\n${indent(formatEvidenceForAgent(evidence))}` : undefined,
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n');

/** Text the LLM sees: every event in time order with its type, entity, and evidence summary. */
export const formatTimelineForAgent = ({ conversationId, events }: InvestigationTimeline): string =>
  [
    '## Investigation timeline',
    `Conversation: ${conversationId}`,
    events.length > 0 ? sortTimelineEvents(events).map(formatEvent).join('\n') : 'No events yet.',
  ].join('\n');

/**
 * `investigation_timeline`: the events of an investigation on a time axis, one document per space
 * and conversation in `.kibana-investigation-timeline`, replaced as a whole on every write.
 * Origin and attachment id are the document id.
 */
export const timelineAttachment = defineInvestigationAttachment<
  typeof TIMELINE_ATTACHMENT_TYPE,
  TimelineStorageSettings,
  TimelineDocument
>({
  type: TIMELINE_ATTACHMENT_TYPE,
  storageSettings: timelineStorageSettings,
  schema: investigationTimelineSchema,
  // The investigation overview shows the timeline; the chat does not.
  hiddenInConversation: true,
  format: formatTimelineForAgent,
  describe: () => 'Timeline',
  agentDescription:
    'The investigation timeline is the sequence of events (changes, symptoms, detections, actions, recoveries) on a time axis, each with the evidence that places it there.\n\n' +
    'Rules:\n' +
    '- Update it with the `investigations.set_timeline` tool, sending every event every time.\n' +
    "- The investigation's overview shows the timeline, not the chat; do not render it inline.",
});

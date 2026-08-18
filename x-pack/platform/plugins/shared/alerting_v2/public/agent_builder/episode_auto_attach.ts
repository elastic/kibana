/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { ChromeStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import {
  EPISODE_ATTACHMENT_TYPE,
  type AlertEpisode,
  type EpisodeAttachmentData,
} from '@kbn/alerting-v2-schemas';
import { alertEpisodeToEpisodeAttachment } from '../../common/agent_builder/episode_mappers';
import {
  registerAutoAttach,
  type AttachmentConverter,
  type IdGenerator,
  createIdGenerator,
} from './auto_attach';

export { createIdGenerator, type IdGenerator } from './auto_attach';

export interface FocusedEpisode {
  episode: AlertEpisode;
  ruleName?: string;
  groupingFields?: readonly string[];
}

export type PendingEpisodeAttachment = AttachmentInput<
  typeof EPISODE_ATTACHMENT_TYPE,
  EpisodeAttachmentData
>;

export const episodeAttachmentConverter: AttachmentConverter<FocusedEpisode> = {
  toAttachment: (focused, draftId): PendingEpisodeAttachment => ({
    id: draftId,
    type: EPISODE_ATTACHMENT_TYPE,
    origin: focused.episode['episode.id'],
    data: alertEpisodeToEpisodeAttachment(focused.episode, {
      ruleName: focused.ruleName,
      groupingFields: focused.groupingFields,
    }),
  }),
  getOrigin: (focused) => focused.episode['episode.id'],
};

export const registerEpisodeAutoAttach = ({
  agentBuilder,
  chrome,
  focusedEpisode$,
  draftAttachmentId = createIdGenerator(),
}: {
  agentBuilder: AgentBuilderPluginStart;
  chrome: ChromeStart;
  focusedEpisode$: Observable<FocusedEpisode | undefined>;
  draftAttachmentId?: IdGenerator;
}): (() => void) =>
  registerAutoAttach({
    agentBuilder,
    chrome,
    focusedItem$: focusedEpisode$,
    converter: episodeAttachmentConverter,
    draftAttachmentId,
  });

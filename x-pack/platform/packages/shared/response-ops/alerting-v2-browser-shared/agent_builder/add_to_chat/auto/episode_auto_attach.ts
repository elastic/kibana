/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type { ChromeStart } from '@kbn/core/public';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import { registerAutoAttach } from './auto_attach';
import { episodeAttachmentConverter } from '../../episode_attachment_converter';
import type { FocusedEpisode } from '../../types';

export const registerEpisodeAutoAttach = ({
  agentBuilder,
  chrome,
  focusedEpisode$,
}: {
  agentBuilder: AgentBuilderPluginStart;
  chrome: ChromeStart;
  focusedEpisode$: Observable<FocusedEpisode | undefined>;
}): (() => void) =>
  registerAutoAttach({
    agentBuilder,
    chrome,
    focusedItem$: focusedEpisode$,
    converter: episodeAttachmentConverter,
  });

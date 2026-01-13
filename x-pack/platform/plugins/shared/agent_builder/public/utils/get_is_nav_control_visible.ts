/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'rxjs';
import type { CoreStart } from '@kbn/core/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';

/**
 * Returns an Observable that emits whether the Agent Builder nav control should be visible.
 * Only visible when the chat experience is set to Agent mode.
 */
export function getIsNavControlVisible$(coreStart: CoreStart) {
  return coreStart.settings.client
    .get$<AIChatExperience>(AI_CHAT_EXPERIENCE_TYPE)
    .pipe(map((chatExperience) => chatExperience === AIChatExperience.Agent));
}

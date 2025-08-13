/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CONVERSATION_SHARED_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.ownership.title',
  {
    defaultMessage: 'This conversation is shared with your team.',
  }
);

export const DISABLED_OWNERSHIP = i18n.translate(
  'xpack.elasticAssistant.assistant.ownership.disabled',
  {
    defaultMessage: `You can't edit or continue this conversation, but you can duplicate it into a new private conversation. The original conversation will remain unchanged.`,
  }
);

export const OWNERSHIP_CALLOUT = i18n.translate(
  'xpack.elasticAssistant.assistant.ownership.callout',
  {
    defaultMessage: `Any further edits you do to this conversation will be shared with the rest of the team.`,
  }
);

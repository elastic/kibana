/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexEntryCreateFields } from './common_attributes.gen';

export const indexEntryMock: IndexEntryCreateFields = {
  type: 'index',
  name: 'SpongBotSlackConnector',
  namespace: 'default',
  index: 'spongbot',
  field: 'semantic_text',
  description: "Use this index to search for the user's Slack messages.",
};

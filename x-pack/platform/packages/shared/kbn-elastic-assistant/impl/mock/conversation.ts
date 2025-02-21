/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/openai/constants';
import { ClientMessage, Conversation } from '../..';

export const alertConvo: Conversation = {
  id: '',
  title: 'Alert summary',
  category: 'assistant',
  isDefault: true,
  messages: [
    {
      content:
        'You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nIf you answer a question related to KQL or EQL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\nUse the following context to answer questions:\n\nCONTEXT:\n"""\ndestination.ip,67bf8338-261a-4de6-b43e-d30b59e884a7\nhost.name,0b2e352b-35fc-47bd-a8d4-43019ed38a25\nkibana.alert.rule.name,critical hosts\nsource.ip,94277492-11f8-493b-9c52-c1c9ecd330d2\n"""\n\nEvaluate the event from the context above and format your output neatly in markdown syntax for my Elastic Security case.\nAdd your description, recommended actions and bulleted triage steps. Use the MITRE ATT&CK data provided to add more context and recommendations from MITRE, and hyperlink to the relevant pages on MITRE\'s website. Be sure to include the user and host risk score data from the context. Your response should include steps that point to Elastic Security specific features, including endpoint response actions, the Elastic Agent OSQuery manager integration (with example osquery queries), timelines and entity analytics and link to all the relevant Elastic Security documentation.',
      role: 'user',
      timestamp: '2023-03-19T18:59:18.174Z',
    },
  ],
  apiConfig: {
    connectorId: 'c29c28a0-20fe-11ee-9306-a1f4d42ec542',
    actionTypeId: '.gen-ai',
    provider: OpenAiProviderType.OpenAi,
  },
  replacements: {
    '94277492-11f8-493b-9c52-c1c9ecd330d2': '192.168.0.4',
    '67bf8338-261a-4de6-b43e-d30b59e884a7': '192.168.0.1',
    '0b2e352b-35fc-47bd-a8d4-43019ed38a25': 'Stephs-MacBook-Pro.local',
  },
};

export const messageWithContentReferences: ClientMessage = {
  content: 'You have 1 alert.{reference(abcde)}',
  role: 'user',
  timestamp: '2023-03-19T18:59:18.174Z',
  metadata: {
    contentReferences: {
      abcde: {
        id: 'abcde',
        type: 'SecurityAlertsPage',
      },
    },
  },
};

export const emptyWelcomeConvo: Conversation = {
  id: '',
  title: 'Welcome',
  category: 'assistant',
  isDefault: true,
  messages: [],
  replacements: {},
  apiConfig: {
    connectorId: 'c29c28a0-20fe-11ee-9306-a1f4d42ec542',
    actionTypeId: '.gen-ai',
    provider: OpenAiProviderType.OpenAi,
  },
};

export const conversationWithContentReferences: Conversation = {
  ...emptyWelcomeConvo,
  messages: [messageWithContentReferences],
};

export const welcomeConvo: Conversation = {
  ...emptyWelcomeConvo,
  messages: [
    {
      content:
        'You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nIf you answer a question related to KQL or EQL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\nUse the following context to answer questions:\n\n\n\nhow do i write host.name: * in EQL?',
      role: 'user',
      timestamp: '2024-03-18T18:59:18.174Z',
    },
    {
      role: 'assistant',
      content:
        "In EQL (Event Query Language), you can write the equivalent of `host.name: *` using the `exists` operator. Here's how you can write it:\n\n```\nexists(host.name)\n```\n\nThis query will match all events where the `host.name` field exists, effectively giving you the same result as `host.name: *`.",
      timestamp: '2024-03-19T18:59:18.174Z',
    },
  ],
};

export const customConvo: Conversation = {
  id: '',
  category: 'assistant',
  title: 'Custom option',
  isDefault: false,
  messages: [],
  replacements: {},
  apiConfig: {
    connectorId: 'c29c28a0-20fe-11ee-9306-a1f4d42ec542',
    actionTypeId: '.gen-ai',
    provider: OpenAiProviderType.OpenAi,
  },
};

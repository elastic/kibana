/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OpenAiProviderType } from '@kbn/stack-connectors-plugin/common/gen_ai/constants';
import { Conversation } from '../..';

export const alertConvo: Conversation = {
  id: 'Alert summary',
  isDefault: true,
  messages: [
    {
      content:
        'You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nIf you answer a question related to KQL or EQL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\nUse the following context to answer questions:\n\nCONTEXT:\n"""\ndestination.ip,67bf8338-261a-4de6-b43e-d30b59e884a7\nhost.name,0b2e352b-35fc-47bd-a8d4-43019ed38a25\nkibana.alert.rule.name,critical hosts\nsource.ip,94277492-11f8-493b-9c52-c1c9ecd330d2\n"""\n\nEvaluate the event from the context above and format your output neatly in markdown syntax for my Elastic Security case.\nAdd your description, recommended actions and bulleted triage steps. Use the MITRE ATT&CK data provided to add more context and recommendations from MITRE, and hyperlink to the relevant pages on MITRE\'s website. Be sure to include the user and host risk score data from the context. Your response should include steps that point to Elastic Security specific features, including endpoint response actions, the Elastic Agent OSQuery manager integration (with example osquery queries), timelines and entity analytics and link to all the relevant Elastic Security documentation.',
      role: 'user',
      timestamp: '7/18/2023, 10:39:11 AM',
    },
  ],
  apiConfig: {
    connectorId: 'c29c28a0-20fe-11ee-9306-a1f4d42ec542',
    provider: OpenAiProviderType.OpenAi,
  },
  replacements: {
    '94277492-11f8-493b-9c52-c1c9ecd330d2': '192.168.0.4',
    '67bf8338-261a-4de6-b43e-d30b59e884a7': '192.168.0.1',
    '0b2e352b-35fc-47bd-a8d4-43019ed38a25': 'Stephs-MacBook-Pro.local',
  },
};

export const emptyWelcomeConvo: Conversation = {
  id: 'Welcome',
  isDefault: true,
  theme: {
    title: 'Elastic AI Assistant',
    titleIcon: 'logoSecurity',
    assistant: {
      name: 'Elastic AI Assistant',
      icon: 'logoSecurity',
    },
    system: {
      icon: 'logoElastic',
    },
    user: {},
  },
  messages: [],
  apiConfig: {
    connectorId: 'c29c28a0-20fe-11ee-9306-a1f4d42ec542',
    provider: OpenAiProviderType.OpenAi,
  },
};

export const welcomeConvo: Conversation = {
  ...emptyWelcomeConvo,
  messages: [
    {
      content:
        'You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nIf you answer a question related to KQL or EQL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\nUse the following context to answer questions:\n\n\n\nhow do i write host.name: * in EQL?',
      role: 'user',
      timestamp: '7/17/2023, 1:00:36 PM',
    },
    {
      role: 'assistant',
      content:
        "In EQL (Event Query Language), you can write the equivalent of `host.name: *` using the `exists` operator. Here's how you can write it:\n\n```\nexists(host.name)\n```\n\nThis query will match all events where the `host.name` field exists, effectively giving you the same result as `host.name: *`.",
      timestamp: '7/17/2023, 1:00:40 PM',
    },
  ],
};

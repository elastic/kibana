/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Conversation } from '../../assistant_context/types';
import * as i18n from '../../content/prompts/welcome/translations';

export const WELCOME_CONVERSATION_ID = 'welcome';

export const BASE_CONVERSATIONS: Record<string, Conversation> = {
  default: {
    id: 'default',
    messages: [
      {
        role: 'user',
        content: 'Can you provide a sample KQL query please? (Kibana)',
        timestamp: '5/12/2023, 12:04:07 AM',
      },
      {
        role: 'assistant',
        content:
          'Certainly! Here\'s a sample KQL (Kibana Query Language) query for a fictional web server log data:\n\n```\nresponse.keyword: "200" AND extension.keyword: "html" AND NOT (geo.src: "US" OR geo.src: "CA")\n```\n\nThis query will return all documents where:\n\n1. The `response` field has a value of "200" (HTTP status code for a successful request).\n2. The `extension` field has a value of "html" (indicating an HTML file was requested).\n3. The `geo.src` field is not "US" or "CA" (meaning the request did not come from the United States or Canada).\n\nYou can use this query in Kibana\'s Discover or Dashboard panels to filter the data based on these conditions.',
        timestamp: '5/12/2023, 12:04:21 AM',
      },
      {
        role: 'user',
        content:
          'What about an EQL sequence query for 4 failed logons followed by a successful login?',
        timestamp: '5/12/2023, 12:08:31 AM',
      },
      {
        role: 'assistant',
        content:
          'Here\'s an EQL (Event Query Language) sequence query to detect 4 failed logons followed by a successful login for a fictional logon event data:\n\n```eql\nsequence by user.name with maxspan=5m\n  [authentication where result == "failure" and event.action == "logon_attempt"]{4}\n  [authentication where result == "success" and event.action == "logon_attempt"]\n```\n\nThis query will return sequences where:\n\n1. The events are grouped by the `user.name` field.\n2. The maximum time span between the first and last event in the sequence is 5 minutes (`maxspan=5m`).\n3. There are 4 consecutive `authentication` events with a `result` field value of "failure" and an `event.action` field value of "logon_attempt".\n4. After the 4 failed logon attempts, there\'s an `authentication` event with a `result` field value of "success" and an `event.action` field value of "logon_attempt".\n\nYou can use this EQL query in Elasticsearch or Kibana to detect potential brute force attacks or suspicious logon behavior.',
        timestamp: '5/12/2023, 12:08:46 AM',
      },
      {
        role: 'user',
        content: "Can you fix the markdown please, it's not rendering",
        timestamp: '5/12/2023, 12:09:00 AM',
      },
      {
        role: 'assistant',
        content:
          'Apologies for the formatting issue. Here\'s the corrected EQL sequence query:\n\n```\nsequence by user.name with maxspan=5m\n  [authentication where result == "failure" and event.action == "logon_attempt"]{4}\n  [authentication where result == "success" and event.action == "logon_attempt"]\n```\n\nThis query will return sequences where:\n\n1. The events are grouped by the `user.name` field.\n2. The maximum time span between the first and last event in the sequence is 5 minutes (`maxspan=5m`).\n3. There are 4 consecutive `authentication` events with a `result` field value of "failure" and an `event.action` field value of "logon_attempt".\n4. After the 4 failed logon attempts, there\'s an `authentication` event with a `result` field value of "success" and an `event.action` field value of "logon_attempt".\n\nYou can use this EQL query in Elasticsearch or Kibana to detect potential brute force attacks or suspicious logon behavior.',
        timestamp: '5/12/2023, 12:09:16 AM',
      },
      {
        role: 'user',
        content:
          'Can you response with a message that contains both the first KQL query you sent me, and also the EQL sequence query you sent?',
        timestamp: '5/12/2023, 12:11:49 AM',
      },
      {
        role: 'assistant',
        content:
          'Certainly! Here are both the KQL and EQL queries in a single response:\n\n**KQL Query (Kibana Query Language):**\n\n```\nresponse.keyword: "200" AND extension.keyword: "html" AND NOT (geo.src: "US" OR geo.src: "CA")\n```\n\nThis KQL query returns all documents where:\n\n1. The `response` field has a value of "200" (HTTP status code for a successful request).\n2. The `extension` field has a value of "html" (indicating an HTML file was requested).\n3. The `geo.src` field is not "US" or "CA" (meaning the request did not come from the United States or Canada).\n\nYou can use this query in Kibana\'s Discover or Dashboard panels to filter the data based on these conditions.\n\n**EQL Sequence Query (Event Query Language):**\n\n```\nsequence by user.name with maxspan=5m\n  [authentication where result == "failure" and event.action == "logon_attempt"]{4}\n  [authentication where result == "success" and event.action == "logon_attempt"]\n```\n\nThis EQL query returns sequences where:\n\n1. The events are grouped by the `user.name` field.\n2. The maximum time span between the first and last event in the sequence is 5 minutes (`maxspan=5m`).\n3. There are 4 consecutive `authentication` events with a `result` field value of "failure" and an `event.action` field value of "logon_attempt".\n4. After the 4 failed logon attempts, there\'s an `authentication` event with a `result` field value of "success" and an `event.action` field value of "logon_attempt".\n\nYou can use this EQL query in Elasticsearch or Kibana to detect potential brute force attacks or suspicious logon behavior.',
        timestamp: '5/12/2023, 12:12:09 AM',
      },
      {
        role: 'user',
        content:
          'Last but not least, could you write an Elasticsearch QueryDSL for filtering events where `event.action` is `logon_attempt`',
        timestamp: '5/12/2023, 12:30:38 AM',
      },
      {
        role: 'assistant',
        content:
          'Certainly! Here\'s an Elasticsearch QueryDSL for filtering events where `file.name` is `fake_behavior.exe`:\n\n```json\n{\n  "match_phrase": {\n    "file.name": {\n      "query": "fake_behavior.exe"\n    }\n  }\n}\n```\n\nThis QueryDSL is searching for documents where the file.name field matches the exact phrase "fake_behavior.exe". It is useful for finding documents that have a specific file name in an Elasticsearch index.',
        timestamp: '5/12/2023, 12:30:49 AM',
      },
    ],
    apiConfig: {},
  },
  timeline: {
    id: 'timeline',
    messages: [],
    apiConfig: {},
  },
  [WELCOME_CONVERSATION_ID]: {
    id: 'welcome',
    theme: {
      title: 'Elastic Assistant',
      assistant: {
        icon: 'logoElastic',
      },
      system: {
        icon: 'logoElastic',
      },
      user: {
        icon: 'logoElastic',
      },
    },
    messages: [
      {
        role: 'assistant',
        content: i18n.WELCOME_GENERAL,
        timestamp: '',
        presentation: {
          delay: 2 * 1000,
          stream: true,
        },
      },
      {
        role: 'assistant',
        content: i18n.WELCOME_GENERAL_2,
        timestamp: '',
        presentation: {
          delay: 1000,
          stream: true,
        },
      },
      {
        role: 'assistant',
        content: i18n.WELCOME_GENERAL_3,
        timestamp: '',
        presentation: {
          delay: 1000,
          stream: true,
        },
      },
      // {
      //   role: 'assistant',
      //   content: i18n.WELCOME_NO_CONNECTOR_PRIVILEGES,
      //   timestamp: '',
      // },
    ],
    apiConfig: {},
  },
};

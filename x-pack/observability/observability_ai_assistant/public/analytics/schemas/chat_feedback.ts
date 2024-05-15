/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/analytics-client';
import type { Message, Conversation } from '../../../common';
import type { Feedback } from '../../components/buttons/feedback_buttons';
import { ObservabilityAIAssistantTelemetryEventType } from '../telemetry_event_type';
import { messageSchema } from './common';

export interface ChatFeedback {
  messageWithFeedback: {
    message: Message;
    feedback: Feedback;
  };
  conversation: Conversation;
}

export const chatFeedbackEventSchema: EventTypeOpts<ChatFeedback> = {
  eventType: ObservabilityAIAssistantTelemetryEventType.ChatFeedback,
  schema: {
    messageWithFeedback: {
      properties: {
        message: {
          properties: messageSchema,
        },
        feedback: {
          type: 'text',
          _meta: {
            description: 'Whether the user has deemed this response useful or not',
          },
        },
      },
    },
    conversation: {
      properties: {
        '@timestamp': {
          type: 'text',
          _meta: {
            description: 'The timestamp of the conversation.',
          },
        },
        user: {
          properties: {
            id: {
              type: 'text',
              _meta: {
                description: 'The id of the user.',
                optional: true,
              },
            },
            name: {
              type: 'text',
              _meta: {
                description: 'The name of the user.',
              },
            },
          },
        },
        conversation: {
          properties: {
            id: {
              type: 'text',
              _meta: {
                description: 'The id of the conversation.',
              },
            },
            title: {
              type: 'text',
              _meta: {
                description: 'The title of the conversation.',
              },
            },
            last_updated: {
              type: 'text',
              _meta: {
                description: 'The timestamp of the last message in the conversation.',
              },
            },
            token_count: {
              properties: {
                completion: {
                  type: 'long',
                  _meta: {
                    description: 'The number of tokens in the completion.',
                  },
                },
                prompt: {
                  type: 'long',
                  _meta: {
                    description: 'The number of tokens in the prompt.',
                  },
                },
                total: {
                  type: 'long',
                  _meta: {
                    description: 'The total number of tokens in the conversation.',
                  },
                },
              },
            },
          },
        },
        messages: {
          type: 'array',
          items: {
            properties: messageSchema,
          },
          _meta: {
            description: 'The messages in the conversation.',
          },
        },
        labels: {
          type: 'pass_through',
          _meta: {
            description: 'The labels of the conversation.',
          },
        },
        numeric_labels: {
          type: 'pass_through',
          _meta: {
            description: 'The numeric labels of the conversation.',
          },
        },
        namespace: {
          type: 'text',
          _meta: {
            description: 'The namespace of the conversation.',
          },
        },
        public: {
          type: 'boolean',
          _meta: {
            description: 'Whether the conversation is public or not.',
          },
        },
      },
    },
  },
};

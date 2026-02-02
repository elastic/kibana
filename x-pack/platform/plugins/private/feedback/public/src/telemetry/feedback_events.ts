/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts, RootSchema } from '@kbn/core/public';

export const FEEDBACK_SUBMITTED_EVENT_TYPE = 'feedback_submitted';

export interface FeedbackQuestion {
  id: string;
  question: string;
  answer: string;
}

export interface FeedbackSubmittedEventData {
  app_id: string;
  user_email?: string;
  solution?: string;
  csat_score?: number;
  first_question?: FeedbackQuestion;
  second_question?: FeedbackQuestion;
  organization_id?: string;
  allow_email_contact: boolean;
}

const feedbackSubmittedEventSchema: RootSchema<FeedbackSubmittedEventData> = {
  app_id: {
    type: 'keyword',
    _meta: {
      description: 'The application from which the feedback was submitted',
      optional: false,
    },
  },
  user_email: {
    type: 'keyword',
    _meta: {
      description: 'The email address of the user (if consent is given)',
      optional: true,
    },
  },
  solution: {
    type: 'keyword',
    _meta: {
      description:
        'The active solution view or project type (e.g., security, observability, search)',
      optional: true,
    },
  },
  csat_score: {
    type: 'short',
    _meta: {
      description: 'The CSAT satisfaction score selected by the user',
      optional: true,
    },
  },
  first_question: {
    type: 'pass_through',
    _meta: {
      description: 'The first feedback question and answer',
      optional: true,
    },
  },
  second_question: {
    type: 'pass_through',
    _meta: {
      description: 'The general feedback text from the user',
      optional: true,
    },
  },
  allow_email_contact: {
    type: 'boolean',
    _meta: {
      description: 'Whether the user consents to being contacted via email',
      optional: false,
    },
  },
  organization_id: {
    type: 'keyword',
    _meta: {
      description: 'The organization id of the user submitting feedback',
      optional: true,
    },
  },
};

export const feedbackSubmittedEventType: EventTypeOpts<FeedbackSubmittedEventData> = {
  eventType: FEEDBACK_SUBMITTED_EVENT_TYPE,
  schema: feedbackSubmittedEventSchema,
};

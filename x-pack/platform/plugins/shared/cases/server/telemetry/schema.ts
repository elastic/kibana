/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CasesTelemetrySchema,
  TypeLong,
  CountSchema,
  StatusSchema,
  LatestDatesSchema,
  TypeString,
  SolutionTelemetrySchema,
  AssigneesSchema,
  AttachmentFrameworkSchema,
  AttachmentItemsSchema,
  CustomFieldsSolutionTelemetrySchema,
} from './types';

const long: TypeLong = { type: 'long' };
const string: TypeString = { type: 'keyword' };

const countSchema: CountSchema = {
  total: long,
  monthly: long,
  weekly: long,
  daily: long,
};

interface AttachmentRegistrySchema {
  type: 'array';
  items: AttachmentItemsSchema;
}

const attachmentRegistrySchema: AttachmentRegistrySchema = {
  type: 'array',
  items: {
    average: long,
    maxOnACase: long,
    total: long,
    type: string,
  },
};

const attachmentFrameworkSchema: AttachmentFrameworkSchema = {
  persistableAttachments: attachmentRegistrySchema,
  externalAttachments: attachmentRegistrySchema,
  files: {
    average: long,
    averageSize: long,
    maxOnACase: long,
    total: long,
    topMimeTypes: {
      type: 'array',
      items: {
        count: long,
        name: string,
      },
    },
  },
};

const assigneesSchema: AssigneesSchema = {
  total: long,
  totalWithZero: long,
  totalWithAtLeastOne: long,
};

const solutionTelemetry: SolutionTelemetrySchema = {
  ...countSchema,
  assignees: assigneesSchema,
  attachmentFramework: attachmentFrameworkSchema,
};

const customFieldsSolutionTelemetrySchema: CustomFieldsSolutionTelemetrySchema = {
  customFields: {
    totalsByType: {
      DYNAMIC_KEY: long,
    },
    totals: long,
    required: long,
  },
};

const statusSchema: StatusSchema = {
  open: long,
  inProgress: long,
  closed: long,
};

const latestDatesSchema: LatestDatesSchema = {
  createdAt: string,
  updatedAt: string,
  closedAt: string,
};

export const casesSchema: CasesTelemetrySchema = {
  cases: {
    all: {
      ...countSchema,
      attachmentFramework: attachmentFrameworkSchema,
      assignees: assigneesSchema,
      status: statusSchema,
      syncAlertsOn: long,
      syncAlertsOff: long,
      totalUsers: long,
      totalParticipants: long,
      totalTags: long,
      totalWithAlerts: long,
      totalWithConnectors: long,
      latestDates: latestDatesSchema,
    },
    sec: solutionTelemetry,
    obs: solutionTelemetry,
    main: solutionTelemetry,
  },
  userActions: { all: { ...countSchema, maxOnACase: long } },
  comments: { all: { ...countSchema, maxOnACase: long } },
  alerts: { all: { ...countSchema, maxOnACase: long } },
  connectors: {
    all: {
      all: { totalAttached: long },
      itsm: { totalAttached: long },
      sir: { totalAttached: long },
      jira: { totalAttached: long },
      resilient: { totalAttached: long },
      swimlane: { totalAttached: long },
      maxAttachedToACase: long,
    },
  },
  pushes: {
    all: { total: long, maxOnACase: long },
  },
  configuration: {
    all: {
      closure: {
        manually: long,
        automatic: long,
      },
      ...customFieldsSolutionTelemetrySchema,
    },
    sec: customFieldsSolutionTelemetrySchema,
    obs: customFieldsSolutionTelemetrySchema,
    main: customFieldsSolutionTelemetrySchema,
  },
  casesSystemAction: {
    totalCasesCreated: long,
    totalRules: long,
  },
};

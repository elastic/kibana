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
  AttachmentTypeStatsSchema,
  CustomFieldsSolutionTelemetrySchema,
  FieldLibrarySolutionTelemetrySchema,
  ObservablesSchema,
} from './types';

const long: TypeLong = { type: 'long' };
const string: TypeString = { type: 'keyword' };

const countSchema: CountSchema = {
  total: long,
  monthly: long,
  weekly: long,
  daily: long,
};

const attachmentTypeStatsSchema: AttachmentTypeStatsSchema = {
  total: {
    type: 'long',
    _meta: { description: 'Total number of attachments of this type, across all cases' },
  },
  average: {
    type: 'long',
    _meta: { description: 'Average number of attachments of this type per case' },
  },
};

const attachmentFrameworkSchema: AttachmentFrameworkSchema = {
  attachmentsByType: {
    DYNAMIC_KEY: attachmentTypeStatsSchema,
  },
  bySavedObject: {
    legacy: {
      total: {
        type: 'long',
        _meta: {
          description:
            'Total number of attachments sourced from the legacy comment saved object (entity-aware: bulk alert/event attachments count by referenced id)',
        },
      },
    },
    unified: {
      total: {
        type: 'long',
        _meta: {
          description:
            'Total number of attachments sourced from the unified attachment saved object (entity-aware: bulk alert/event attachments count by referenced id)',
        },
      },
    },
  },
  files: {
    averageSize: long,
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

const statusSchema: StatusSchema = {
  open: long,
  inProgress: long,
  closed: long,
};

const observablesSchema: ObservablesSchema = {
  auto: {
    default: {
      type: 'long',
      _meta: { description: 'Number of default type observables automatically extracted' },
    },
    custom: {
      type: 'long',
      _meta: { description: 'Number of custom type observables automatically extracted' },
    },
  },
  manual: {
    default: {
      type: 'long',
      _meta: { description: 'Number of default type observables manually added' },
    },
    custom: {
      type: 'long',
      _meta: { description: 'Number of custom type observables manually added' },
    },
  },
  total: {
    type: 'long',
    _meta: { description: 'Total number of observables' },
  },
};

const solutionTelemetry: SolutionTelemetrySchema = {
  ...countSchema,
  assignees: assigneesSchema,
  attachmentFramework: attachmentFrameworkSchema,
  totalWithAlerts: long,
  status: statusSchema,
  observables: observablesSchema,
  totalWithMaxObservables: {
    type: 'long',
    _meta: { description: 'Number of cases with maximum observables' },
  },
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

const latestDatesSchema: LatestDatesSchema = {
  createdAt: string,
  updatedAt: string,
  closedAt: string,
};

const fieldLibrarySolutionTelemetrySchema: FieldLibrarySolutionTelemetrySchema = {
  total: {
    type: 'long',
    _meta: {
      description:
        'Number of field definitions in the Field Library for this scope. The all scope spans every owner, including owners outside the three reported solutions, so the solution scopes need not sum to it',
    },
  },
  totalGlobal: {
    type: 'long',
    _meta: {
      description:
        'Number of field definitions applied to every case. Includes the global definitions created by the templates v1 to v2 migration to mirror pre-existing custom fields, which cannot be distinguished from author-created ones',
    },
  },
  totalReusable: {
    type: 'long',
    _meta: {
      description:
        'Number of field definitions available to be referenced by a template rather than applied to every case. Counts availability, not actual template references',
    },
  },
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
      extractObservablesOn: {
        type: 'long',
        _meta: { description: 'Automatically extract observables setting enabled' },
      },
      extractObservablesOff: {
        type: 'long',
        _meta: { description: 'Automatically extract observables setting disabled' },
      },
      observables: observablesSchema,
      totalWithMaxObservables: {
        type: 'long',
        _meta: { description: 'Number of cases with maximum observables' },
      },
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
  alerts: {
    all: { ...countSchema, maxOnACase: long },
    obs: { ...countSchema, maxOnACase: long },
    sec: { ...countSchema, maxOnACase: long },
    main: { ...countSchema, maxOnACase: long },
  },
  connectors: {
    all: {
      all: {
        totalAttached: {
          type: 'long',
          _meta: { description: 'Total number of all cases with any connector attached' },
        },
      },
      itsm: {
        totalAttached: {
          type: 'long',
          _meta: { description: 'Total number of cases with ServiceNow ITSM connector attached' },
        },
      },
      sir: {
        totalAttached: {
          type: 'long',
          _meta: { description: 'Total number of cases with ServiceNow SIR connector attached' },
        },
      },
      jira: {
        totalAttached: {
          type: 'long',
          _meta: { description: 'Total number of cases with Jira connector attached' },
        },
      },
      resilient: {
        totalAttached: {
          type: 'long',
          _meta: { description: 'Total number of cases with Resilient connector attached' },
        },
      },
      swimlane: {
        totalAttached: {
          type: 'long',
          _meta: { description: 'Total number of cases with Swimlane connector attached' },
        },
      },
      thehive: {
        totalAttached: {
          type: 'long',
          _meta: { description: 'Total number of cases with The Hive connector attached' },
        },
      },
      caseswebhook: {
        totalAttached: {
          type: 'long',
          _meta: { description: 'Total number of cases with Cases Webhook connector attached' },
        },
      },
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
  fieldLibrary: {
    featureEnabled: {
      type: 'boolean',
      _meta: {
        description:
          'Whether xpack.cases.templates.enabled is on. When it is off the field definitions are not queried and the counts report zero, even though a deployment that disabled the feature keeps any definitions it already created',
      },
    },
    all: fieldLibrarySolutionTelemetrySchema,
    sec: fieldLibrarySolutionTelemetrySchema,
    obs: fieldLibrarySolutionTelemetrySchema,
    main: fieldLibrarySolutionTelemetrySchema,
  },
};

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
  ObservablesSchema,
  TemplatesSolutionTelemetrySchema,
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

const templatesSolutionTelemetrySchema: TemplatesSolutionTelemetrySchema = {
  total: {
    type: 'long',
    _meta: {
      description:
        'Number of live templates, counting each template once by its latest non-soft-deleted version',
    },
  },
  totalEnabled: {
    type: 'long',
    _meta: {
      description:
        'Number of live templates that are enabled. Templates persisted before the enabled flag existed count as enabled, matching how the templates service reads it',
    },
  },
  totalDisabled: {
    type: 'long',
    _meta: { description: 'Number of live templates that are disabled' },
  },
  totalSoftDeleted: {
    type: 'long',
    _meta: { description: 'Number of templates that have been soft-deleted' },
  },
  totalMigratedFromV1: {
    type: 'long',
    _meta: {
      description:
        'Number of live templates that were created by the templates v1 to v2 migration rather than authored directly',
    },
  },
  versionPercentiles: {
    p50: {
      type: 'long',
      _meta: {
        description: 'Rounded 50th percentile of the version across live templates',
      },
    },
    p90: {
      type: 'long',
      _meta: {
        description: 'Rounded 90th percentile of the version across live templates',
      },
    },
    p99: {
      type: 'long',
      _meta: {
        description: 'Rounded 99th percentile of the version across live templates',
      },
    },
  },
  fieldCount: {
    total: {
      type: 'long',
      _meta: {
        description:
          'Total number of fields declared across all live templates. Counts fields as written in the definition, so it includes a $ref field whose library definition is missing, and is therefore not comparable with the fieldDefinitions totals below',
      },
    },
    max: {
      type: 'long',
      _meta: { description: 'Highest number of fields declared by a single live template' },
    },
    average: {
      type: 'long',
      _meta: { description: 'Average number of fields declared per live template, rounded' },
    },
  },
  fieldDefinitions: {
    totalsByControl: {
      DYNAMIC_KEY: {
        type: 'long',
        _meta: {
          description:
            'Number of resolved field definitions using this control across live templates. Only the most frequent controls are reported',
        },
      },
    },
    totalsByType: {
      DYNAMIC_KEY: {
        type: 'long',
        _meta: {
          description:
            'Number of resolved field definitions using this field type across live templates. Only the most frequent types are reported',
        },
      },
    },
  },
  cases: {
    withTemplate: {
      total: {
        type: 'long',
        _meta: {
          description:
            'Number of cases that reference a template. A case records the template it was created from, but an update may later change or clear that reference, so this is a current-state count',
        },
      },
      monthly: {
        type: 'long',
        _meta: {
          description: 'Cases created in the last month that reference a template',
        },
      },
      weekly: {
        type: 'long',
        _meta: {
          description: 'Cases created in the last week that reference a template',
        },
      },
      daily: {
        type: 'long',
        _meta: {
          description: 'Cases created in the last day that reference a template',
        },
      },
    },
    withoutTemplate: {
      total: {
        type: 'long',
        _meta: {
          description: 'Number of cases that reference no template',
        },
      },
      monthly: {
        type: 'long',
        _meta: {
          description: 'Cases created in the last month that reference no template',
        },
      },
      weekly: {
        type: 'long',
        _meta: {
          description: 'Cases created in the last week that reference no template',
        },
      },
      daily: {
        type: 'long',
        _meta: {
          description: 'Cases created in the last day that reference no template',
        },
      },
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
  templates: {
    featureEnabled: {
      type: 'boolean',
      _meta: {
        description:
          'Whether xpack.cases.templates.enabled is on. When it is off the template counts are not queried and report zero',
      },
    },
    all: templatesSolutionTelemetrySchema,
    sec: templatesSolutionTelemetrySchema,
    obs: templatesSolutionTelemetrySchema,
    main: templatesSolutionTelemetrySchema,
  },
};

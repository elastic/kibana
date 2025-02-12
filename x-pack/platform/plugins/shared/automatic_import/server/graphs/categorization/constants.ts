/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ECS_CATEGORIES = {
  api: 'Covers events from API calls, including those from OS and network protocols. Allowed event.type combinations: access, admin, allowed, change, creation, deletion, denied, end, info, start, user',
  authentication:
    'Focuses on login and credential verification processes. Allowed event.type combinations: start, end, info',
  configuration:
    'Deals with application, process, or system settings changes. Allowed event.type combinations: access, change, creation, deletion, info',
  database:
    'Relates to data storage systems, such as SQL or Elasticsearch. Allowed event.type combinations: access, change, info, error',
  driver:
    'Involves OS device driver activities. Allowed event.type combinations: change, end, info, start',
  email: 'Covers events from email messages and protocols. Allowed event.type combinations: info',
  file: 'Related to file creation, access, and deletion. Allowed event.type combinations: access, change, creation, deletion, info',
  host: 'Provides information about hosts, excluding activity on them. Allowed event.type combinations: access, change, end, info, start',
  iam: 'Concerns users, groups, and administration events. Allowed event.type combinations: admin, change, creation, deletion, group, info, user',
  intrusion_detection:
    'Detects intrusions from IDS/IPS systems. Allowed event.type combinations: allowed, denied, info',
  library:
    'Refers to the loading of libraries into processes. Allowed event.type combinations: start',
  malware: 'Focuses on malware detection events and alerts. Allowed event.type combinations: info',
  network:
    'Captures all network-related activities. Allowed event.type combinations: access, allowed, connection, denied, end, info, protocol, start',
  package:
    'Concerns software packages on hosts. Allowed event.type combinations: access, change, deletion, info, installation, start',
  process:
    'Addresses process-specific details. Allowed event.type combinations: access, change, end, info, start',
  registry:
    'Focuses on Windows registry settings. Allowed event.type combinations: access, change, creation, deletion',
  session:
    'Relates to persistent connections to hosts/services. Allowed event.type combinations: start, end, info',
  threat:
    "Describes threat actors' intentions and behaviors. Allowed event.type combinations: indicator",
  vulnerability: 'Pertain to vulnerability scan outcomes. Allowed event.type combinations: info',
  web: 'Concerns web server access events. access, error, Allowed event.type combinations: info',
};

export const ECS_TYPES = {
  access: 'Used to indicate something was accessed. Examples include accessing databases or files.',
  admin:
    'Pertains to events related to admin objects, like administrative changes in IAM not tied to specific users or groups.',
  allowed:
    'Indicates that a certain action or event was permitted, like firewall connections that were permitted.',
  change:
    'Used for events indicating that something has changed, such as modifications in files or processes.',
  connection:
    'Mainly for network-related events, capturing details sufficient for flow or connection analysis, like Netflow or IPFIX events.',
  creation: 'Denotes that something was created. A typical example is file creation.',
  deletion: 'Indicates that something was removed or deleted, for instance, file deletions.',
  denied:
    'Refers to events where something was denied or blocked, such as a network connection that was blocked by a firewall.',
  end: 'Suggests that something has concluded or ended, like a process.',
  error:
    'Used for events that describe errors, but not errors during event ingestion. For instance, database errors.',
  group:
    'Pertains to group-related events within categories, like creation or modification of user groups in IAM.',
  indicator:
    'Represents events that contain indicators of compromise (IOCs), commonly associated with threat detection.',
  info: "Denotes purely informational events that don't imply a state change or an action. For example, system information logs.",
  installation: 'Indicates that something was installed, typically software or packages.',
  protocol:
    'Used for events containing detailed protocol analysis, beyond just naming the protocol, especially in network events.',
  start: 'Signals the commencement of something, such as a process.',
  user: 'Relates to user-centric events within categories, like user creation or deletion in IAM.',
};

export const EVENT_TYPES = [
  'access',
  'admin',
  'allowed',
  'change',
  'connection',
  'creation',
  'deletion',
  'denied',
  'end',
  'error',
  'group',
  'indicator',
  'info',
  'installation',
  'protocol',
  'start',
  'user',
];

export const EVENT_CATEGORIES = [
  'api',
  'authentication',
  'configuration',
  'database',
  'driver',
  'email',
  'file',
  'host',
  'iam',
  'intrusion_detection',
  'library',
  'malware',
  'network',
  'package',
  'process',
  'registry',
  'session',
  'threat',
  'vulnerability',
  'web',
];

export type EventCategories =
  | 'api'
  | 'authentication'
  | 'configuration'
  | 'database'
  | 'driver'
  | 'email'
  | 'file'
  | 'host'
  | 'iam'
  | 'intrusion_detection'
  | 'library'
  | 'malware'
  | 'network'
  | 'package'
  | 'process'
  | 'registry'
  | 'session'
  | 'threat'
  | 'vulnerability'
  | 'web';

export const ECS_EVENT_TYPES_PER_CATEGORY: {
  [key in EventCategories]: string[];
} = {
  api: [
    'access',
    'admin',
    'allowed',
    'change',
    'creation',
    'deletion',
    'denied',
    'end',
    'info',
    'start',
    'user',
  ],
  authentication: ['start', 'end', 'info'],
  configuration: ['access', 'change', 'creation', 'deletion', 'info'],
  database: ['access', 'change', 'info', 'error'],
  driver: ['change', 'end', 'info', 'start'],
  email: ['info'],
  file: ['access', 'change', 'creation', 'deletion', 'info'],
  host: ['access', 'change', 'end', 'info', 'start'],
  iam: ['admin', 'change', 'creation', 'deletion', 'group', 'info', 'user'],
  intrusion_detection: ['allowed', 'denied', 'info'],
  library: ['start'],
  malware: ['info'],
  network: ['access', 'allowed', 'connection', 'denied', 'end', 'info', 'protocol', 'start'],
  package: ['access', 'change', 'deletion', 'info', 'installation', 'start'],
  process: ['access', 'change', 'end', 'info', 'start'],
  registry: ['access', 'change', 'creation', 'deletion'],
  session: ['start', 'end', 'info'],
  threat: ['indicator'],
  vulnerability: ['info'],
  web: ['access', 'error', 'info'],
};

export const CATEGORIZATION_EXAMPLE_PROCESSORS = `
If condition that determines if ctx.checkpoint?.operation is not of a specific value:
{
  "field": "event.category",
  "value": ["network"],
  "if": "ctx.checkpoint?.operation != 'Log In'"
}

If condition that determines if ctx.checkpoint?.operation is of a specific value:
{
  "field": "event.category",
  "value": ["authentication"],
  "if": "ctx.checkpoint?.operation == 'Log In'"
}

Appending multiple values when either the value Accept or Allow is found in ctx.checkpoint?.rule_action:
{
  "field": "event.type",
  "value": ["allowed", "connection"],
  "if": "['Accept', 'Allow'].contains(ctx.checkpoint?.rule_action)"
}
`;

export const CATEGORIZATION_EXAMPLE_ANSWER = [
  {
    field: 'event.type',
    value: ['access'],
  },
  {
    field: 'event.type',
    value: ['allowed', 'connection'],
    if: "['Accept', 'Allow'].contains(ctx.checkpoint?.rule_action)",
  },
  {
    field: 'event.category',
    value: ['network'],
    if: "['Accept', 'Allow'].contains(ctx.checkpoint?.rule_action)",
  },
  {
    field: 'event.type',
    value: ['start'],
    if: "ctx.checkpoint?.operation == 'Log In'",
  },
  {
    field: 'event.category',
    value: ['authentication'],
    if: "ctx.checkpoint?.operation == 'Log In'",
  },
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MergeCasesPreviewResponse,
  MergeConflict,
  MergeExtendedFieldPreview,
  MergePreviewCase,
} from '../../../../common/types/api';
import {
  CaseSeverity,
  CaseStatuses,
  ConnectorTypes,
  CustomFieldTypes,
} from '../../../../common/types/domain';

const emptySummary = () => ({
  total: 0,
  duplicates: 0,
  existing: 0,
  toCopy: 0,
  leftOut: 0,
  notCopied: [],
  max: null,
  overBy: 0,
});

const user = (name: string) => ({ username: name, full_name: name, email: null });

export const previewCase = (
  id: string,
  incrementalId: number,
  title: string,
  overrides: Partial<MergePreviewCase> = {}
): MergePreviewCase => ({
  id,
  version: `${id}-v`,
  title,
  incrementalId,
  status: CaseStatuses.open,
  severity: CaseSeverity.LOW,
  owner: 'securitySolution',
  createdAt: '2026-11-12T09:14:00.000Z',
  totalAlerts: 10,
  template: null,
  description: '',
  createdBy: user('Priya Raman'),
  closedAt: null,
  closedBy: null,
  assignees: [],
  tags: [],
  totalComments: 2,
  totalObservables: 3,
  templateName: null,
  ...overrides,
});

export const CASES: MergePreviewCase[] = [
  previewCase('c118', 118, 'Brute-force sign-ins on VPN gateway vpn-edge-02', {
    severity: CaseSeverity.HIGH,
    totalAlerts: 312,
    tags: ['brute-force', 'vpn'],
    templateName: 'Credential access triage',
  }),
  previewCase('c121', 121, 'Failed logins for svc-backup from 185.220.101.4', {
    status: CaseStatuses['in-progress'],
    severity: CaseSeverity.MEDIUM,
  }),
  previewCase('c124', 124, 'Impossible travel for j.chen (Lagos to Oslo)', {
    severity: CaseSeverity.CRITICAL,
  }),
  previewCase('c130', 130, 'Password spray against the Okta tenant', {
    status: CaseStatuses.closed,
    severity: CaseSeverity.HIGH,
    closedAt: '2026-11-16T10:00:00.000Z',
    closedBy: user('Marco Silva'),
    description: 'Spray of 6 common passwords across 1,900 Okta accounts. 2 accounts locked.',
  }),
];

const conflict = (
  field: MergeConflict['field'],
  key?: string,
  reason: MergeConflict['reason'] = 'differentValues'
): MergeConflict => ({ field, key, reason, resolved: false });

export const CREDENTIAL_TEMPLATE = {
  id: 'tpl-credential',
  name: 'Credential access triage',
  isEnabled: true,
};
export const IDENTITY_TEMPLATE = { id: 'tpl-identity', name: 'Identity incident', isEnabled: true };

export const verdictField: MergeExtendedFieldPreview = {
  key: 'verdict_as_keyword',
  name: 'verdict',
  label: 'Verdict',
  control: 'SELECT_BASIC',
  multiValue: false,
  required: false,
  isGlobal: true,
  errors: [],
  definition: {
    type: 'keyword',
    options: ['True positive', 'Undetermined', 'False positive', 'Benign'],
  },
  value: 'True positive',
  provenance: 'oldest',
  sourceCaseId: 'c121',
  options: [
    { value: 'True positive', caseIds: ['c121', 'c124'] },
    { value: 'Undetermined', caseIds: ['c118'] },
  ],
  hasConflict: true,
};

export const attackVectorField: MergeExtendedFieldPreview = {
  key: 'attack_vector_as_keyword',
  name: 'attack_vector',
  label: 'Attack vector',
  control: 'SELECT_BASIC',
  multiValue: false,
  required: false,
  isGlobal: false,
  errors: [],
  definition: { type: 'keyword', options: ['Password spray', 'Phishing', 'Token theft'] },
  value: 'Password spray',
  provenance: 'oldest',
  sourceCaseId: 'c130',
  options: [
    { value: 'Password spray', caseIds: ['c130'] },
    {
      value: 'Brute force',
      caseIds: ['c118'],
      invalid: { code: 'notAnOption', message: 'Not an option in Identity incident' },
    },
  ],
  hasConflict: true,
};

export const businessImpactField: MergeExtendedFieldPreview = {
  key: 'business_impact_as_keyword',
  name: 'business_impact',
  label: 'Business impact',
  control: 'SELECT_BASIC',
  multiValue: false,
  required: true,
  isGlobal: false,
  errors: [],
  definition: { type: 'keyword', options: ['None', 'Degraded', 'Outage'] },
  value: '',
  provenance: 'none',
  sourceCaseId: null,
  options: [],
  hasConflict: false,
};

export const impactedSystemsField: MergeExtendedFieldPreview = {
  key: 'impacted_systems_as_keyword',
  name: 'impacted_systems',
  label: 'Impacted systems',
  control: 'CHECKBOX_GROUP',
  multiValue: true,
  required: false,
  isGlobal: true,
  errors: [],
  definition: { type: 'keyword', options: ['VPN', 'Backup', 'Okta', 'Email'] },
  value: '["VPN","Backup","Okta"]',
  provenance: 'combined',
  sourceCaseId: null,
  options: [],
  hasConflict: false,
  items: [
    { value: 'VPN', caseIds: ['c118', 'c121'] },
    { value: 'Backup', caseIds: ['c121'] },
    { value: 'Okta', caseIds: ['c124'] },
  ],
  notCopiedValues: [{ value: 'Jump host', caseIds: ['c121'] }],
};

/** Four cases that disagree on most fields, merged into a new case. */
export const buildDifferencesPreview = ({
  conflicts,
  fields = {},
  cases = CASES,
}: {
  conflicts?: MergeConflict[];
  fields?: Partial<MergeCasesPreviewResponse['fields']>;
  cases?: MergePreviewCase[];
} = {}): MergeCasesPreviewResponse => ({
  cases,
  destination: { id: null, isNew: true },
  fields: {
    title: {
      value: cases[0].title,
      provenance: 'oldest',
      sourceCaseId: cases[0].id,
      options: cases.map(({ id, title }) => ({ value: title, caseIds: [id] })),
      hasConflict: true,
    },
    description: {
      value: 'Over 300 failed sign-ins.',
      provenance: 'oldest',
      sourceCaseId: 'c118',
      options: [
        { value: 'Over 300 failed sign-ins.', caseIds: ['c118'] },
        { value: 'svc-backup failed 520 logins.', caseIds: ['c121', 'c124', 'c130'] },
      ],
      hasConflict: true,
      combinedValue: null,
      combinedLength: 120,
    },
    severity: {
      value: CaseSeverity.CRITICAL,
      provenance: 'highest',
      sourceCaseId: 'c124',
      options: [
        { value: CaseSeverity.CRITICAL, caseIds: ['c124'] },
        { value: CaseSeverity.HIGH, caseIds: ['c118', 'c130'] },
        { value: CaseSeverity.MEDIUM, caseIds: ['c121'] },
      ],
      hasConflict: true,
    },
    category: {
      value: 'Credential access',
      provenance: 'oldest',
      sourceCaseId: 'c118',
      options: [
        { value: 'Credential access', caseIds: ['c118', 'c121'] },
        { value: 'Identity', caseIds: ['c124', 'c130'] },
      ],
      hasConflict: true,
    },
    connector: {
      value: { id: 'none', name: 'none', type: ConnectorTypes.none, fields: null },
      provenance: 'none',
      sourceCaseId: null,
      options: [],
      hasConflict: false,
    },
    template: {
      value: CREDENTIAL_TEMPLATE,
      provenance: 'mostUsed',
      sourceCaseId: 'c118',
      options: [
        { value: CREDENTIAL_TEMPLATE, caseIds: ['c118', 'c121'] },
        { value: IDENTITY_TEMPLATE, caseIds: ['c124', 'c130'] },
      ],
      hasConflict: true,
      candidates: [CREDENTIAL_TEMPLATE, IDENTITY_TEMPLATE],
    },
    customFields: [
      {
        key: 'ticket',
        type: CustomFieldTypes.TEXT,
        label: 'Ticket ID',
        required: false,
        value: 'INC-20431',
        provenance: 'oldest',
        sourceCaseId: 'c121',
        options: [
          { value: 'INC-20431', caseIds: ['c121'] },
          { value: 'INC-20457', caseIds: ['c124'] },
        ],
        hasConflict: true,
      },
    ],
    extendedFields: [verdictField, attackVectorField, impactedSystemsField],
    tags: {
      value: ['brute-force', 'vpn', 'identity'],
      provenance: 'combined',
      max: 200,
      overBy: 0,
      items: [
        { value: 'brute-force', caseIds: ['c118', 'c121'] },
        { value: 'vpn', caseIds: ['c118'] },
        { value: 'identity', caseIds: ['c124'] },
      ],
    },
    assignees: {
      value: [{ uid: 'u-priya' }],
      provenance: 'combined',
      max: 10,
      overBy: 0,
      items: [{ value: { uid: 'u-priya' }, caseIds: ['c118', 'c124'] }],
      canChange: true,
      unavailableReason: null,
    },
    notCopiedFields: [],
    ...fields,
  },
  effectiveTemplate: { id: CREDENTIAL_TEMPLATE.id, version: 1, name: CREDENTIAL_TEMPLATE.name },
  conflicts: conflicts ?? [
    conflict('template'),
    conflict('title'),
    conflict('description'),
    conflict('severity'),
    conflict('category'),
    conflict('customFields', 'ticket'),
    conflict('extendedFields', 'verdict_as_keyword'),
    conflict('extendedFields', 'attack_vector_as_keyword'),
  ],
  limits: [],
  canMerge: false,
  attachments: {
    alerts: {
      total: 0,
      duplicates: 0,
      existing: 0,
      toCopy: 0,
      leftOut: 0,
      notCopied: [],
      max: 1000,
      overBy: 0,
      byRule: [],
    },
    events: emptySummary(),
    attacks: emptySummary(),
    observables: emptySummary(),
    other: emptySummary(),
    files: { total: 0, byCase: [] },
    comments: { total: 0, byCase: [] },
  },
  choices: { alerts: [], events: [], attacks: [], observables: [], other: [] },
});

export { conflict as buildConflict };

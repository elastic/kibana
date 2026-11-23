/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import { InferenceConnectorType } from '@kbn/inference-common';
import { inferenceMock } from '@kbn/inference-plugin/server/mocks';
import { MAX_TITLE_LENGTH } from '../../../../common/constants';
import { CASES_API_ERROR_CODES } from '../../../../common/constants/error_codes';
import type {
  MergeCasesPreviewResponse,
  MergeConflict,
  MergeExtendedFieldPreview,
  MergePreviewCase,
} from '../../../../common/types/api';
import type { CaseConnector } from '../../../../common/types/domain';
import {
  CaseSeverity,
  CaseStatuses,
  ConnectorTypes,
  CustomFieldTypes,
} from '../../../../common/types/domain';
import { getTypedApiErrorAttributes } from '../../../common/api_errors';
import { isCaseError } from '../../../common/error';
import { createCasesClientMock, createCasesClientMockArgs } from '../../mocks';
import { mergeResolve } from './resolve';
import { MERGE_RESOLVE_SYSTEM_PROMPT } from './resolve_prompt';

const previewCase = (id: string, incrementalId: number, title: string): MergePreviewCase => ({
  id,
  version: 'v1',
  title,
  incrementalId,
  status: CaseStatuses.open,
  severity: CaseSeverity.LOW,
  owner: 'securitySolution',
  createdAt: '2026-11-01T00:00:00.000Z',
  totalAlerts: 3,
  template: null,
  merge: null,
  description: `Description of ${title}`,
  createdBy: { username: 'elastic', full_name: null, email: null },
  closedAt: null,
  closedBy: null,
  assignees: [],
  tags: [],
  totalComments: 0,
  totalObservables: 0,
  templateName: null,
});

const noneConnector: CaseConnector = {
  id: 'none',
  name: 'none',
  type: ConnectorTypes.none,
  fields: null,
};
const jiraConnector: CaseConnector = {
  id: 'jira-1',
  name: 'Jira',
  type: ConnectorTypes.jira,
  fields: { issueType: 'Task', priority: null, parent: null },
};
const phishingTemplate = { id: 'tpl-phishing', name: 'Phishing', isEnabled: true };
const oldTemplate = { id: 'tpl-old', name: 'Old', isEnabled: false };

const conflict = (
  field: MergeConflict['field'],
  key?: string,
  overrides: Partial<MergeConflict> = {}
): MergeConflict => ({ field, key, reason: 'differentValues', resolved: false, ...overrides });

const single = <T>(value: T) => ({
  value,
  provenance: 'oldest' as const,
  sourceCaseId: 'case-1',
  options: [],
  hasConflict: false,
});

const extendedField = (
  overrides: Partial<MergeExtendedFieldPreview> = {}
): MergeExtendedFieldPreview => ({
  ...single(''),
  key: 'impact_as_keyword',
  name: 'impact',
  label: 'Impact',
  control: 'SELECT_BASIC',
  multiValue: false,
  required: false,
  isGlobal: true,
  errors: [],
  definition: { type: 'keyword', options: ['Low', 'High'] },
  hasConflict: true,
  options: [
    { value: 'Low', caseIds: ['case-1'] },
    { value: 'High', caseIds: ['case-2'] },
  ],
  ...overrides,
});

const buildPreview = (
  overrides: Partial<MergeCasesPreviewResponse> = {}
): MergeCasesPreviewResponse => ({
  cases: [
    previewCase('case-1', 118, 'Phishing email'),
    previewCase('case-2', 121, 'Credential theft'),
  ],
  destination: { id: null, isNew: true },
  fields: {
    title: {
      ...single('Phishing email'),
      hasConflict: true,
      options: [
        { value: 'Phishing email', caseIds: ['case-1'] },
        { value: 'Credential theft', caseIds: ['case-2'] },
      ],
    },
    description: { ...single('Description'), combinedValue: null, combinedLength: 0 },
    severity: {
      ...single(CaseSeverity.LOW),
      hasConflict: true,
      options: [
        { value: CaseSeverity.LOW, caseIds: ['case-1'] },
        { value: CaseSeverity.CRITICAL, caseIds: ['case-2'] },
      ],
    },
    category: {
      ...single<string | null>('Phishing'),
      hasConflict: true,
      options: [
        { value: 'Phishing', caseIds: ['case-1'] },
        { value: 'Identity', caseIds: ['case-2'] },
      ],
    },
    connector: {
      ...single(noneConnector),
      hasConflict: true,
      options: [{ value: jiraConnector, caseIds: ['case-2'] }],
    },
    template: { ...single(null), candidates: [] },
    customFields: [
      {
        ...single<string | number | boolean | null>(true),
        key: 'escalated',
        type: CustomFieldTypes.TOGGLE,
        label: 'Escalated',
        required: false,
        hasConflict: true,
        options: [
          { value: true, caseIds: ['case-1'] },
          { value: false, caseIds: ['case-2'] },
        ],
      },
    ],
    extendedFields: [extendedField()],
    tags: { value: [], provenance: 'none', max: 200, overBy: 0, items: [] },
    assignees: {
      value: [],
      provenance: 'none',
      max: 10,
      overBy: 0,
      items: [],
      canChange: true,
      unavailableReason: null,
    },
    notCopiedFields: [],
  },
  effectiveTemplate: null,
  conflicts: [
    conflict('title'),
    conflict('severity'),
    conflict('category'),
    conflict('connector'),
    conflict('customFields', 'escalated', { label: 'Escalated' }),
    conflict('extendedFields', 'impact_as_keyword', { label: 'Impact' }),
  ],
  limits: [],
  canMerge: false,
  attachments: {
    alerts: {
      total: 6,
      duplicates: 0,
      existing: 0,
      toCopy: 6,
      leftOut: 0,
      notCopied: [],
      max: 1000,
      overBy: 0,
      byRule: [{ ruleId: 'rule-1', ruleName: 'Suspicious login', count: 6 }],
    },
    events: emptySummary(),
    attacks: emptySummary(),
    observables: emptySummary(),
    other: emptySummary(),
    files: { total: 0, byCase: [] },
    comments: { total: 0, byCase: [] },
  },
  choices: { alerts: [], events: [], attacks: [], observables: [], other: [] },
  ...overrides,
});

function emptySummary() {
  return {
    total: 0,
    duplicates: 0,
    existing: 0,
    toCopy: 0,
    leftOut: 0,
    notCopied: [],
    max: null,
    overBy: 0,
  };
}

const setup = ({
  previews = [buildPreview()],
  answers = [],
  hasInference = true,
  defaultConnectorId = 'default-connector',
  isEnterprise = true,
}: {
  previews?: MergeCasesPreviewResponse[];
  answers?: Array<{ resolutions: Array<Record<string, unknown>> }>;
  hasInference?: boolean;
  defaultConnectorId?: string | null;
  isEnterprise?: boolean;
} = {}) => {
  const output = jest.fn();
  answers.forEach((answer) => output.mockResolvedValueOnce({ id: 'x', output: answer }));

  const inference = inferenceMock.createStartContract();
  inference.getDefaultConnector.mockResolvedValue(
    defaultConnectorId != null
      ? {
          connectorId: defaultConnectorId,
          name: 'GPT',
          type: InferenceConnectorType.OpenAI,
          config: {},
          capabilities: {},
          isInferenceEndpoint: false,
          isPreconfigured: false,
        }
      : undefined
  );
  inference.getClient.mockReturnValue({ output } as unknown as BoundInferenceClient);

  const clientArgs = {
    ...createCasesClientMockArgs(),
    ...(hasInference ? { inference } : {}),
  };
  clientArgs.services.licensingService.isAtLeastEnterprise.mockResolvedValue(isEnterprise);

  const casesClient = createCasesClientMock();
  previews.forEach((preview) => casesClient.cases.mergePreview.mockResolvedValueOnce(preview));

  return { output, inference, clientArgs, casesClient };
};

const getErrorCode = (error: unknown) =>
  getTypedApiErrorAttributes(isCaseError(error) ? error.boomify() : error)?.code;

describe('mergeResolve', () => {
  const params = { caseIds: ['case-1', 'case-2'] };

  it("maps the AI's answers to merge fields, each with its reason", async () => {
    const { output, inference, clientArgs, casesClient } = setup({
      answers: [
        {
          resolutions: [
            { id: 'title', text: 'Phishing leading to credential theft', reason: 'Covers both.' },
            { id: 'severity', option: 1, reason: '#121 is critical.' },
            { id: 'category', option: 0, reason: 'It started as phishing.' },
            { id: 'connector', option: 0, reason: '#121 is tracked in Jira.' },
            { id: 'customFields.escalated', option: 0, reason: '#118 was escalated.' },
            { id: 'extendedFields.impact_as_keyword', option: 1, reason: 'Highest impact.' },
          ],
        },
      ],
    });

    const result = await mergeResolve(params, clientArgs, casesClient);

    expect(result).toEqual({
      fields: {
        title: 'Phishing leading to credential theft',
        severity: CaseSeverity.CRITICAL,
        category: 'Phishing',
        connector: jiraConnector,
        customFields: [{ key: 'escalated', type: CustomFieldTypes.TOGGLE, value: true }],
        extendedFields: { impact_as_keyword: 'High' },
      },
      reasons: [
        { field: 'title', reason: 'Covers both.' },
        { field: 'severity', reason: '#121 is critical.' },
        { field: 'category', reason: 'It started as phishing.' },
        { field: 'connector', reason: '#121 is tracked in Jira.' },
        { field: 'customFields', key: 'escalated', reason: '#118 was escalated.' },
        { field: 'extendedFields', key: 'impact_as_keyword', reason: 'Highest impact.' },
      ],
    });
    expect(inference.getClient).toHaveBeenCalledWith({
      request: clientArgs.request,
      bindTo: { connectorId: 'default-connector' },
    });
    expect(output).toHaveBeenCalledTimes(1);
    expect(output).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'cases_merge_resolve',
        system: MERGE_RESOLVE_SYSTEM_PROMPT,
        retry: { onValidationError: 1 },
      })
    );
  });

  it('describes the merge, the cases and every field in the prompt', async () => {
    const { output, clientArgs, casesClient } = setup({
      previews: [buildPreview({ destination: { id: 'case-1', isNew: false } })],
      answers: [{ resolutions: [] }],
    });

    await mergeResolve({ ...params, destinationCaseId: 'case-1' }, clientArgs, casesClient);

    const [{ input, schema }] = output.mock.calls[0];
    expect(input).toContain('Into the existing case #118, which is kept.');
    expect(input).toContain('### #121 "Credential theft"');
    expect(input).toContain('Description of Credential theft');
    expect(input).toContain('Alerts by rule across the cases: Suspicious login (6).');
    expect(input).toContain(`You may write text of at most ${MAX_TITLE_LENGTH} characters`);
    expect(input).toContain('  1: "critical" (from #121)');
    expect(input).toContain('A SELECT_BASIC field allowing Low, High.');
    expect(schema.properties.resolutions.items.properties.id.enum).toEqual([
      'title',
      'severity',
      'category',
      'connector',
      'customFields.escalated',
      'extendedFields.impact_as_keyword',
    ]);
  });

  it('drops answers it cannot use, leaving those fields for the user', async () => {
    const preview = buildPreview({
      fields: {
        ...buildPreview().fields,
        extendedFields: [
          extendedField({
            options: [
              {
                value: 'Medium',
                caseIds: ['case-1'],
                invalid: { code: 'notAnOption', message: 'Not an option' },
              },
              { value: 'High', caseIds: ['case-2'] },
            ],
          }),
        ],
      },
    });
    const { clientArgs, casesClient } = setup({
      previews: [preview],
      answers: [
        {
          resolutions: [
            // Over the limit, and no option to fall back to.
            { id: 'title', text: 'x'.repeat(MAX_TITLE_LENGTH + 1), reason: 'Too long.' },
            // Only the title and description may be written.
            { id: 'category', text: 'Something new', reason: 'Invented.' },
            { id: 'severity', option: 5, reason: 'Out of range.' },
            { id: 'severity', option: 0.5, reason: 'Not an index.' },
            { id: 'connector', option: 0, reason: 'First answer wins.' },
            { id: 'connector', option: 0, reason: 'Ignored.' },
            { id: 'assignees', option: 0, reason: 'Not asked.' },
            // The invalid option is not offered, so index 0 is "High".
            { id: 'extendedFields.impact_as_keyword', option: 0, reason: 'Valid one.' },
          ],
        },
      ],
    });

    const result = await mergeResolve(params, clientArgs, casesClient);

    expect(result).toEqual({
      fields: { connector: jiraConnector, extendedFields: { impact_as_keyword: 'High' } },
      reasons: [
        { field: 'connector', reason: 'First answer wins.' },
        { field: 'extendedFields', key: 'impact_as_keyword', reason: 'Valid one.' },
      ],
    });
  });

  it('falls back to the option when the written title does not fit', async () => {
    const { clientArgs, casesClient } = setup({
      answers: [
        {
          resolutions: [{ id: 'title', text: '   ', option: 1, reason: 'The clearer title.' }],
        },
      ],
    });

    const result = await mergeResolve(params, clientArgs, casesClient);

    expect(result.fields).toEqual({ title: 'Credential theft' });
  });

  it('asks nothing when no field needs a value', async () => {
    const { output, clientArgs, casesClient } = setup({
      previews: [
        buildPreview({
          conflicts: [
            conflict('title', undefined, { resolved: true }),
            conflict('extendedFields', 'impact_as_keyword', { reason: 'required' }),
          ],
          fields: { ...buildPreview().fields, extendedFields: [extendedField({ options: [] })] },
        }),
      ],
      hasInference: false,
    });

    await expect(mergeResolve(params, clientArgs, casesClient)).resolves.toEqual({
      fields: {},
      reasons: [],
    });
    expect(output).not.toHaveBeenCalled();
  });

  it('uses the connector the request names', async () => {
    const { inference, clientArgs, casesClient } = setup({ answers: [{ resolutions: [] }] });

    await mergeResolve({ ...params, connectorId: 'claude' }, clientArgs, casesClient);

    expect(inference.getDefaultConnector).not.toHaveBeenCalled();
    expect(inference.getClient).toHaveBeenCalledWith(
      expect.objectContaining({ bindTo: { connectorId: 'claude' } })
    );
  });

  it('says so when there is no AI connector', async () => {
    const { clientArgs, casesClient } = setup({ defaultConnectorId: null });

    const error = await mergeResolve(params, clientArgs, casesClient).catch((e) => e);

    expect(getErrorCode(error)).toBe(CASES_API_ERROR_CODES.MERGE_RESOLVE_NO_AI_CONNECTOR);
  });

  it('says so when the inference plugin is off', async () => {
    const { clientArgs, casesClient } = setup({ hasInference: false });

    const error = await mergeResolve(params, clientArgs, casesClient).catch((e) => e);

    expect(getErrorCode(error)).toBe(CASES_API_ERROR_CODES.MERGE_RESOLVE_NO_AI_CONNECTOR);
  });

  it('refuses below an Enterprise license', async () => {
    const { output, casesClient, clientArgs } = setup({ isEnterprise: false });

    await expect(mergeResolve(params, clientArgs, casesClient)).rejects.toThrow(
      'requires an Enterprise license'
    );
    expect(casesClient.cases.mergePreview).not.toHaveBeenCalled();
    expect(output).not.toHaveBeenCalled();
  });

  describe('template fields', () => {
    const templateField = extendedField({
      key: 'vector_as_keyword',
      name: 'vector',
      label: 'Attack vector',
      isGlobal: false,
      definition: { type: 'keyword', options: ['Email', 'Web'] },
      options: [
        { value: 'Email', caseIds: ['case-1'] },
        { value: 'Web', caseIds: ['case-2'] },
      ],
    });
    const withTemplateConflict = buildPreview({
      fields: {
        ...buildPreview().fields,
        template: {
          ...single(null),
          hasConflict: true,
          options: [
            { value: phishingTemplate, caseIds: ['case-1'] },
            { value: oldTemplate, caseIds: ['case-2'] },
          ],
          candidates: [phishingTemplate, oldTemplate],
        },
        extendedFields: [templateField],
      },
      conflicts: [
        conflict('template'),
        conflict('severity'),
        conflict('extendedFields', 'vector_as_keyword', { label: 'Attack vector' }),
      ],
    });
    const afterTemplate = buildPreview({
      fields: {
        ...withTemplateConflict.fields,
        template: { ...withTemplateConflict.fields.template, value: phishingTemplate },
      },
      conflicts: [
        conflict('template', undefined, { resolved: true }),
        conflict('severity', undefined, { resolved: true }),
        conflict('extendedFields', 'vector_as_keyword', { label: 'Attack vector' }),
      ],
    });

    it('settles the template first, then the fields it brings', async () => {
      const { output, clientArgs, casesClient } = setup({
        previews: [withTemplateConflict, afterTemplate],
        answers: [
          {
            resolutions: [
              // A disabled template is not offered, so index 0 is "Phishing".
              { id: 'template', option: 0, reason: 'The only one still enabled.' },
              { id: 'severity', option: 1, reason: 'The highest.' },
            ],
          },
          {
            resolutions: [
              { id: 'extendedFields.vector_as_keyword', option: 0, reason: 'It began by email.' },
            ],
          },
        ],
      });

      const result = await mergeResolve(params, clientArgs, casesClient);

      expect(
        output.mock.calls[0][0].schema.properties.resolutions.items.properties.id.enum
      ).toEqual(['template', 'severity']);
      expect(casesClient.cases.mergePreview).toHaveBeenLastCalledWith({
        caseIds: ['case-1', 'case-2'],
        fields: { template: { id: 'tpl-phishing' }, severity: CaseSeverity.CRITICAL },
      });
      expect(output.mock.calls[1][0].input).toContain('## Already decided');
      expect(output.mock.calls[1][0].input).toContain('- Template: "Phishing"');
      expect(result).toEqual({
        fields: {
          template: { id: 'tpl-phishing' },
          severity: CaseSeverity.CRITICAL,
          extendedFields: { vector_as_keyword: 'Email' },
        },
        reasons: [
          { field: 'template', reason: 'The only one still enabled.' },
          { field: 'severity', reason: 'The highest.' },
          { field: 'extendedFields', key: 'vector_as_keyword', reason: 'It began by email.' },
        ],
      });
    });

    it('makes one call when the request already sets the template', async () => {
      const { output, clientArgs, casesClient } = setup({
        previews: [
          buildPreview({
            ...withTemplateConflict,
            conflicts: [
              conflict('template', undefined, { resolved: true }),
              conflict('extendedFields', 'vector_as_keyword', { label: 'Attack vector' }),
            ],
          }),
        ],
        answers: [
          {
            resolutions: [
              { id: 'extendedFields.vector_as_keyword', option: 1, reason: 'Web first.' },
            ],
          },
        ],
      });

      const result = await mergeResolve(
        { ...params, fields: { template: { id: 'tpl-phishing' } } },
        clientArgs,
        casesClient
      );

      expect(output).toHaveBeenCalledTimes(1);
      expect(result.fields).toEqual({ extendedFields: { vector_as_keyword: 'Web' } });
    });

    it('leaves the template fields hidden when the AI does not pick a template', async () => {
      const { output, clientArgs, casesClient } = setup({
        previews: [withTemplateConflict],
        answers: [{ resolutions: [{ id: 'severity', option: 0, reason: 'Low.' }] }],
      });

      const result = await mergeResolve(params, clientArgs, casesClient);

      expect(output).toHaveBeenCalledTimes(1);
      expect(casesClient.cases.mergePreview).toHaveBeenCalledTimes(1);
      expect(result.fields).toEqual({ severity: CaseSeverity.LOW });
    });
  });
});

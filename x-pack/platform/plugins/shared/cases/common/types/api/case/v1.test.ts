/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ASSIGNEES_FILTER_LENGTH,
  MAX_ASSIGNEES_PER_CASE,
  MAX_CASES_PER_PAGE,
  MAX_CASES_TO_UPDATE,
  MAX_CATEGORY_FILTER_LENGTH,
  MAX_CATEGORY_LENGTH,
  MAX_CUSTOM_FIELDS_PER_CASE,
  MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_LENGTH_PER_TAG,
  MAX_REPORTERS_FILTER_LENGTH,
  MAX_TAGS_FILTER_LENGTH,
  MAX_TAGS_PER_CASE,
  MAX_TITLE_LENGTH,
} from '../../../constants';
import { DeepStrict } from '@kbn/zod-helpers';
import { parseErrors } from '../../../test_helpers/zod_schema_test_utils';
import { CaseSeverity, CaseStatuses } from '../../domain/case/v1';
import { ConnectorTypes } from '../../domain/connector/v1';
import { CustomFieldTypes } from '../../domain/custom_field/v1';
import type { CasePostRequest } from './v1';
import {
  CasePatchRequestSchema,
  CasePostRequestSchema,
  CasesFindRequestSchema,
  CasesPatchRequestSchema,
  CasesSearchRequestSchema,
} from './v1';

const validPostRequest: CasePostRequest = {
  description: 'A description',
  tags: ['new', 'case'],
  title: 'My new case',
  connector: {
    id: '123',
    name: 'My connector',
    type: ConnectorTypes.jira,
    fields: { issueType: 'Task', priority: 'High', parent: null },
  },
  settings: {
    syncAlerts: true,
  },
  owner: 'cases',
  severity: CaseSeverity.LOW,
  assignees: [{ uid: 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0' }],
  customFields: [
    {
      key: 'first_custom_field_key',
      type: CustomFieldTypes.TEXT,
      value: 'this is a text field value',
    },
    {
      key: 'second_custom_field_key',
      type: CustomFieldTypes.TOGGLE,
      value: true,
    },
    {
      key: 'third_custom_field_key',
      type: CustomFieldTypes.NUMBER,
      value: 3,
    },
  ],
};

describe('CasePostRequestSchema', () => {
  it('accepts a valid request', () => {
    const result = CasePostRequestSchema.safeParse(validPostRequest);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(validPostRequest);
  });

  it('strips unknown top-level fields', () => {
    const result = CasePostRequestSchema.safeParse({ ...validPostRequest, foo: 'bar' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty('foo');
  });

  it('strips unknown fields from connector', () => {
    const result = CasePostRequestSchema.safeParse({
      ...validPostRequest,
      connector: { ...validPostRequest.connector, foo: 'bar' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data.connector as Record<string, unknown>).foo).toBeUndefined();
    }
  });

  it('rejects more than MAX_ASSIGNEES_PER_CASE assignees', () => {
    const assignees = Array(MAX_ASSIGNEES_PER_CASE + 1).fill({ uid: 'foobar' });
    expect(parseErrors(CasePostRequestSchema, { ...validPostRequest, assignees })).toContain(
      `The length of the field assignees is too long. Array must be of length <= ${MAX_ASSIGNEES_PER_CASE}.`
    );
  });

  it('accepts an empty assignees array', () => {
    const result = CasePostRequestSchema.safeParse({ ...validPostRequest, assignees: [] });
    expect(result.success).toBe(true);
  });

  it('accepts undefined assignees', () => {
    const { assignees, ...rest } = validPostRequest;
    expect(CasePostRequestSchema.safeParse(rest).success).toBe(true);
  });

  it('rejects description exceeding MAX_DESCRIPTION_LENGTH', () => {
    const description = 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1);
    expect(parseErrors(CasePostRequestSchema, { ...validPostRequest, description })).toContain(
      `The length of the description is too long. The maximum length is ${MAX_DESCRIPTION_LENGTH}.`
    );
  });

  it('rejects whitespace-only description (limitedStringSchema parity)', () => {
    expect(
      parseErrors(CasePostRequestSchema, { ...validPostRequest, description: '   ' })
    ).toContain('The description field cannot be an empty string.');
  });

  it('rejects more than MAX_TAGS_PER_CASE tags', () => {
    const tags = Array(MAX_TAGS_PER_CASE + 1).fill('foobar');
    expect(parseErrors(CasePostRequestSchema, { ...validPostRequest, tags })).toContain(
      `The length of the field tags is too long. Array must be of length <= ${MAX_TAGS_PER_CASE}.`
    );
  });

  it('rejects a tag exceeding MAX_LENGTH_PER_TAG', () => {
    const tags = ['a'.repeat(MAX_LENGTH_PER_TAG + 1)];
    expect(parseErrors(CasePostRequestSchema, { ...validPostRequest, tags })).toContain(
      `The length of the tag is too long. The maximum length is ${MAX_LENGTH_PER_TAG}.`
    );
  });

  it('rejects title exceeding MAX_TITLE_LENGTH', () => {
    const title = 'a'.repeat(MAX_TITLE_LENGTH + 1);
    expect(parseErrors(CasePostRequestSchema, { ...validPostRequest, title })).toContain(
      `The length of the title is too long. The maximum length is ${MAX_TITLE_LENGTH}.`
    );
  });

  it('rejects category exceeding MAX_CATEGORY_LENGTH', () => {
    const category = 'a'.repeat(MAX_CATEGORY_LENGTH + 1);
    expect(parseErrors(CasePostRequestSchema, { ...validPostRequest, category })).toContain(
      `The length of the category is too long. The maximum length is ${MAX_CATEGORY_LENGTH}.`
    );
  });

  it('rejects more than MAX_CUSTOM_FIELDS_PER_CASE customFields', () => {
    const customFields = Array(MAX_CUSTOM_FIELDS_PER_CASE + 1).fill({
      key: 'k',
      type: CustomFieldTypes.TEXT,
      value: 'v',
    });
    expect(parseErrors(CasePostRequestSchema, { ...validPostRequest, customFields })).toContain(
      `The length of the field customFields is too long. Array must be of length <= ${MAX_CUSTOM_FIELDS_PER_CASE}.`
    );
  });

  it('rejects a TEXT customField value exceeding MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH', () => {
    const customFields = [
      {
        key: 'k',
        type: CustomFieldTypes.TEXT,
        value: 'a'.repeat(MAX_CUSTOM_FIELD_TEXT_VALUE_LENGTH + 1),
      },
    ];
    const result = CasePostRequestSchema.safeParse({ ...validPostRequest, customFields });
    expect(result.success).toBe(false);
  });

  it('rejects an empty TEXT customField value', () => {
    const customFields = [{ key: 'k', type: CustomFieldTypes.TEXT, value: '' }];
    const result = CasePostRequestSchema.safeParse({ ...validPostRequest, customFields });
    expect(result.success).toBe(false);
  });

  it('rejects a NUMBER customField value above Number.MAX_SAFE_INTEGER', () => {
    const customFields = [
      { key: 'k', type: CustomFieldTypes.NUMBER, value: Number.MAX_SAFE_INTEGER + 1 },
    ];
    const result = CasePostRequestSchema.safeParse({ ...validPostRequest, customFields });
    expect(result.success).toBe(false);
  });

  it('rejects a NUMBER customField value below Number.MIN_SAFE_INTEGER', () => {
    const customFields = [
      { key: 'k', type: CustomFieldTypes.NUMBER, value: Number.MIN_SAFE_INTEGER - 1 },
    ];
    const result = CasePostRequestSchema.safeParse({ ...validPostRequest, customFields });
    expect(result.success).toBe(false);
  });

  it('DeepStrict-wrapped schema rejects unknown top-level fields (route-layer parity)', () => {
    const result = DeepStrict(CasePostRequestSchema).safeParse({
      ...validPostRequest,
      foo: 'bar',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    const { description, ...rest } = validPostRequest;
    expect(CasePostRequestSchema.safeParse(rest).success).toBe(false);
  });
});

describe('CasePatchRequestSchema', () => {
  const validPatch = {
    id: 'abc-123',
    version: 'WzQ3LDFc',
    title: 'Updated title',
  };

  it('accepts a valid partial update with id and version', () => {
    expect(CasePatchRequestSchema.safeParse(validPatch).success).toBe(true);
  });

  it('rejects missing id', () => {
    const { id, ...rest } = validPatch;
    expect(CasePatchRequestSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects missing version', () => {
    const { version, ...rest } = validPatch;
    expect(CasePatchRequestSchema.safeParse(rest).success).toBe(false);
  });

  it('accepts id and version with no other fields', () => {
    expect(CasePatchRequestSchema.safeParse({ id: 'a', version: 'b' }).success).toBe(true);
  });

  it('rejects whitespace-only title (length-bounded fields enforce trim parity)', () => {
    expect(parseErrors(CasePatchRequestSchema, { ...validPatch, title: '   ' })).toContain(
      'The title field cannot be an empty string.'
    );
  });
});

describe('CasesPatchRequestSchema', () => {
  const validPatch = { id: 'abc-123', version: 'WzQ3LDFc', title: 'Updated' };

  it('accepts a non-empty cases array', () => {
    expect(CasesPatchRequestSchema.safeParse({ cases: [validPatch] }).success).toBe(true);
  });

  it('rejects an empty cases array', () => {
    expect(parseErrors(CasesPatchRequestSchema, { cases: [] })).toContain(
      'The length of the field cases is too short. Array must be of length >= 1.'
    );
  });

  it(`rejects more than ${MAX_CASES_TO_UPDATE} cases`, () => {
    const cases = Array(MAX_CASES_TO_UPDATE + 1).fill(validPatch);
    expect(parseErrors(CasesPatchRequestSchema, { cases })).toContain(
      `The length of the field cases is too long. Array must be of length <= ${MAX_CASES_TO_UPDATE}.`
    );
  });
});

describe('CasesFindRequestSchema', () => {
  it('accepts an empty body (all filters optional)', () => {
    expect(CasesFindRequestSchema.safeParse({}).success).toBe(true);
  });

  it('accepts numeric strings for page/perPage (NumberFromString parity)', () => {
    expect(CasesFindRequestSchema.safeParse({ page: '1', perPage: '20' }).success).toBe(true);
  });

  it('rejects non-numeric strings for page/perPage (NumberFromString parity)', () => {
    const result = CasesFindRequestSchema.safeParse({ page: 'a', perPage: 'b' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toEqual(
        expect.arrayContaining(['cannot parse to a number', 'cannot parse to a number'])
      );
    }
  });

  it(`rejects perPage above MAX_CASES_PER_PAGE (${MAX_CASES_PER_PAGE})`, () => {
    expect(parseErrors(CasesFindRequestSchema, { perPage: MAX_CASES_PER_PAGE + 1 })).toContain(
      `The provided perPage value is too high. The maximum allowed perPage value is ${MAX_CASES_PER_PAGE}.`
    );
  });

  it('accepts both array and string forms of tags / status / severity / assignees / reporters / owner', () => {
    const arrayForm = CasesFindRequestSchema.safeParse({
      tags: ['a', 'b'],
      status: [CaseStatuses.open, CaseStatuses.closed],
      severity: [CaseSeverity.LOW, CaseSeverity.HIGH],
      assignees: ['u1', 'u2'],
      reporters: ['r1'],
      owner: ['cases'],
    });
    expect(arrayForm.success).toBe(true);

    const stringForm = CasesFindRequestSchema.safeParse({
      tags: 'a',
      status: CaseStatuses.open,
      severity: CaseSeverity.LOW,
      assignees: 'u1',
      reporters: 'r1',
      owner: 'cases',
    });
    expect(stringForm.success).toBe(true);
  });

  it(`rejects category array with ${MAX_CATEGORY_FILTER_LENGTH + 1} items`, () => {
    const category = Array(MAX_CATEGORY_FILTER_LENGTH + 1).fill('x');
    expect(parseErrors(CasesFindRequestSchema, { category })).toContain(
      `The length of the field category is too long. Array must be of length <= ${MAX_CATEGORY_FILTER_LENGTH}.`
    );
  });

  it(`rejects tags array with ${MAX_TAGS_FILTER_LENGTH + 1} items`, () => {
    const tags = Array(MAX_TAGS_FILTER_LENGTH + 1).fill('x');
    expect(parseErrors(CasesFindRequestSchema, { tags })).toContain(
      `The length of the field tags is too long. Array must be of length <= ${MAX_TAGS_FILTER_LENGTH}.`
    );
  });

  it(`rejects assignees array with ${MAX_ASSIGNEES_FILTER_LENGTH + 1} items`, () => {
    const assignees = Array(MAX_ASSIGNEES_FILTER_LENGTH + 1).fill('x');
    expect(parseErrors(CasesFindRequestSchema, { assignees })).toContain(
      `The length of the field assignees is too long. Array must be of length <= ${MAX_ASSIGNEES_FILTER_LENGTH}.`
    );
  });

  it(`rejects reporters array with ${MAX_REPORTERS_FILTER_LENGTH + 1} items`, () => {
    const reporters = Array(MAX_REPORTERS_FILTER_LENGTH + 1).fill('x');
    expect(parseErrors(CasesFindRequestSchema, { reporters })).toContain(
      `The length of the field reporters is too long. Array must be of length <= ${MAX_REPORTERS_FILTER_LENGTH}.`
    );
  });

  it('rejects an invalid sortField enum value', () => {
    expect(CasesFindRequestSchema.safeParse({ sortField: 'badField' }).success).toBe(false);
  });

  it('rejects an invalid searchField enum value', () => {
    expect(CasesFindRequestSchema.safeParse({ searchFields: ['badField'] }).success).toBe(false);
  });

  it('DeepStrict-wrapped schema rejects unknown top-level fields (route-layer parity)', () => {
    const result = DeepStrict(CasesFindRequestSchema).safeParse({ rootSearchField: 'bad' });
    expect(result.success).toBe(false);
  });
});

describe('CasesSearchRequestSchema', () => {
  it('accepts the documented searchFields enum values', () => {
    const result = CasesSearchRequestSchema.safeParse({
      searchFields: ['cases.description', 'cases-comments.comment'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unsupported searchFields value', () => {
    expect(CasesSearchRequestSchema.safeParse({ searchFields: ['cases.unknown'] }).success).toBe(
      false
    );
  });

  it('accepts extendedFieldFilters', () => {
    const result = CasesSearchRequestSchema.safeParse({
      extendedFieldFilters: [{ label: 'priority', value: 'high' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects extendedFieldFilters with missing fields', () => {
    expect(
      CasesSearchRequestSchema.safeParse({ extendedFieldFilters: [{ label: 'priority' }] }).success
    ).toBe(false);
  });
});

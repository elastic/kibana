/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import { TemplateFieldsFormReady } from './template_fields_form_ready';
import type { TemplateFieldsFormApi } from './template_fields_form_ready';
import { FieldType } from '../../../../common/types/domain/template/fields';
import type { InlineField } from '../../../../common/types/domain/template/fields';

jest.mock('../../templates_v2/field_types/field_renderer', () => ({
  FieldsRenderer: () => null,
}));

// Helper: mount in batch mode and read form values after mount
const getInitialValues = (
  resolvedFields: InlineField[],
  extendedFields: Record<string, unknown>
): Record<string, unknown> => {
  const formApiRef: MutableRefObject<TemplateFieldsFormApi | null> = { current: null };
  render(
    <TemplateFieldsFormReady
      resolvedFields={resolvedFields}
      extendedFields={extendedFields}
      formApiRef={formApiRef}
      applyDefaults
    />
  );
  return formApiRef.current?.getValues() ?? {};
};

describe('TemplateFieldsFormReady — batch mode carry-over (applyDefaults)', () => {
  describe('SELECT_BASIC', () => {
    const field: InlineField = {
      name: 'status',
      type: 'keyword',
      control: FieldType.SELECT_BASIC,
      metadata: { options: ['open', 'pending'] },
    };

    it('carries over an existing value that is still a valid option', () => {
      const values = getInitialValues([field], { statusAsKeyword: 'open' });
      expect(values.status_as_keyword).toBe('open');
    });

    it('drops an existing value that is no longer in the option set', () => {
      const values = getInitialValues([field], { statusAsKeyword: 'closed' });
      expect(values.status_as_keyword).toBe('');
    });

    it('uses the template default when there is no existing value', () => {
      const fieldWithDefault: InlineField = {
        ...field,
        metadata: { options: ['open', 'pending'], default: 'open' },
      };
      const values = getInitialValues([fieldWithDefault], {});
      expect(values.status_as_keyword).toBe('open');
    });

    it('drops an existing value when the metadata.options list is empty', () => {
      const emptyOptionsField: InlineField = {
        ...field,
        metadata: { options: [] },
      };
      const values = getInitialValues([emptyOptionsField], { statusAsKeyword: 'open' });
      expect(values.status_as_keyword).toBe('');
    });
  });

  describe('RADIO_GROUP', () => {
    const field: InlineField = {
      name: 'priority',
      type: 'keyword',
      control: FieldType.RADIO_GROUP,
      metadata: { options: ['low', 'medium', 'high'] },
    };

    it('carries over a valid option', () => {
      const values = getInitialValues([field], { priorityAsKeyword: 'high' });
      expect(values.priority_as_keyword).toBe('high');
    });

    it('drops an option that no longer exists in the new template', () => {
      const values = getInitialValues([field], { priorityAsKeyword: 'critical' });
      expect(values.priority_as_keyword).toBe('');
    });
  });

  describe('CHECKBOX_GROUP', () => {
    const field: InlineField = {
      name: 'tags',
      type: 'keyword',
      control: FieldType.CHECKBOX_GROUP,
      metadata: { options: ['alpha', 'beta', 'gamma'] },
    };

    it('carries over items that are still valid options', () => {
      const existing = JSON.stringify(['alpha', 'beta']);
      const values = getInitialValues([field], { tagsAsKeyword: existing });
      expect(values.tags_as_keyword).toBe(JSON.stringify(['alpha', 'beta']));
    });

    it('filters out items that are no longer valid and keeps the rest', () => {
      const existing = JSON.stringify(['alpha', 'deleted']);
      const values = getInitialValues([field], { tagsAsKeyword: existing });
      expect(values.tags_as_keyword).toBe(JSON.stringify(['alpha']));
    });

    it('drops the whole value when all checked items are stale', () => {
      const existing = JSON.stringify(['old1', 'old2']);
      const values = getInitialValues([field], { tagsAsKeyword: existing });
      expect(values.tags_as_keyword).toBe('');
    });

    it('also accepts an array existingValue (server may return parsed JSON)', () => {
      const values = getInitialValues([field], { tagsAsKeyword: ['alpha', 'beta'] });
      expect(values.tags_as_keyword).toBe(JSON.stringify(['alpha', 'beta']));
    });
  });

  describe('TOGGLE', () => {
    const field: InlineField = {
      name: 'enabled',
      type: 'boolean',
      control: FieldType.TOGGLE,
    };

    it("carries over 'true' (string) unchanged", () => {
      const values = getInitialValues([field], { enabledAsBoolean: 'true' });
      expect(values.enabled_as_boolean).toBe('true');
    });

    it("carries over 'false' (string) unchanged", () => {
      const values = getInitialValues([field], { enabledAsBoolean: 'false' });
      expect(values.enabled_as_boolean).toBe('false');
    });

    it('carries over native boolean true unchanged', () => {
      const values = getInitialValues([field], { enabledAsBoolean: true });
      expect(values.enabled_as_boolean).toBe(true);
    });

    it('carries over native boolean false unchanged', () => {
      const values = getInitialValues([field], { enabledAsBoolean: false });
      expect(values.enabled_as_boolean).toBe(false);
    });

    it('drops a stale non-boolean value that somehow reached a toggle key', () => {
      // A toggle should only ever hold true/false; an arbitrary string like 'high' can only arrive
      // via a stale/hand-edited value. The server rejects non-boolean toggle values with a 400, so
      // we sanitize it out here.
      const values = getInitialValues([field], { enabledAsBoolean: 'high' });
      expect(values.enabled_as_boolean).toBe('');
    });
  });

  describe('non-option controls', () => {
    it('INPUT_TEXT: carries over the existing value unchanged', () => {
      const field: InlineField = {
        name: 'summary',
        type: 'keyword',
        control: FieldType.INPUT_TEXT,
      };
      const values = getInitialValues([field], { summaryAsKeyword: 'my summary' });
      expect(values.summary_as_keyword).toBe('my summary');
    });

    it('TEXTAREA: carries over the existing value unchanged', () => {
      const field: InlineField = {
        name: 'notes',
        type: 'keyword',
        control: FieldType.TEXTAREA,
      };
      const values = getInitialValues([field], { notesAsKeyword: 'some notes' });
      expect(values.notes_as_keyword).toBe('some notes');
    });
  });
});

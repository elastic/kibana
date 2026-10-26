/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';
import { escalationTemplate } from './escalation';
import { investigationTemplate } from './investigation';

const getReportedFieldNames = ({ fields }: ConversationTemplate): string[] =>
  Object.entries(fields).flatMap(([name, { report_changes: reportChanges }]) =>
    reportChanges ? [name] : []
  );

describe('conversation templates: fields reported to Agent Builder telemetry', () => {
  it('the investigation template reports status and close_reason changes', () => {
    expect(getReportedFieldNames(investigationTemplate)).toEqual(['status', 'close_reason']);
  });

  it('the escalation template reports status and close_reason changes', () => {
    expect(getReportedFieldNames(escalationTemplate)).toEqual(['status', 'close_reason']);
  });

  it.each([investigationTemplate, escalationTemplate])(
    'every field $id reports is a SELECT field with options',
    (template) => {
      const reported = getReportedFieldNames(template).map((name) => template.fields[name]);

      expect(reported).not.toHaveLength(0);
      reported.forEach(({ input_type: inputType, options }) => {
        expect(inputType).toBe('SELECT');
        expect(options).toEqual(expect.arrayContaining([expect.any(String)]));
      });
    }
  );
});

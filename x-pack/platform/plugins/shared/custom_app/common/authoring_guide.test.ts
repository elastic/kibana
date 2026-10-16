/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appDocumentSchema, getDocumentIssues } from '@kbn/custom-app-common';
import { AUTHORING_GUIDE_EXAMPLE, CUSTOM_APP_AUTHORING_GUIDE } from './authoring_guide';

describe('the authoring guide', () => {
  it('has an example that is a valid app, so the guide cannot drift from the schema', () => {
    expect(getDocumentIssues(AUTHORING_GUIDE_EXAMPLE)).toEqual([]);
    expect(appDocumentSchema.safeParse(AUTHORING_GUIDE_EXAMPLE).success).toBe(true);
  });

  it('has an example that shows the ideas it teaches: a value set by an input, a row click and a flyout', () => {
    const json = JSON.stringify(AUTHORING_GUIDE_EXAMPLE);

    expect(json).toContain('"bind":"name_filter"');
    expect(json).toContain('?name_filter');
    expect(json).toContain('fromColumn');
    expect(json).toContain('openFlyout');
    expect(json).toContain('{{state.service}}');
  });

  it.each([
    'stack',
    'heading',
    'text',
    'callout',
    'stat',
    'chart',
    'custom_content',
    'table',
    'key_value',
    'select',
    'button_group',
    'search',
    'button',
    'time_range',
    'flyout',
  ])('describes the %s component', (type) => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain(type);
  });

  it('says how a value is used in a query and in text', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('?name');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('{{state.name}}');
  });

  it("says each data component has its own query, and that the look is not the author's to set", () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toMatch(/OWN ES\|QL "query"/);
    expect(CUSTOM_APP_AUTHORING_GUIDE).toMatch(
      /Do not set sizes, spacing, colours or number formats/
    );
  });

  it('does not teach anything the app no longer has', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).not.toMatch(/dataSources|valueField|"gap"|"size"|"format"/);
  });

  it('says there is no shared data source, so a model does not go looking for one', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('there is no shared data source');
  });

  it('teaches how a workflow is run, and that it is run by whoever presses the button', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('runWorkflow');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('as the person who presses the button');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('fromState');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('found with the workflow tools');
  });
});

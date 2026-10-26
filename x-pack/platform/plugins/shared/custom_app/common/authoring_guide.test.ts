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
    'list_input',
    'button',
    'link',
    'form',
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

  it('teaches how alerts are read and acted on, and that cases cannot be listed yet', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('.alerts-*');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('kibana.alert.uuid');
    // The alerts of the newer kind are somewhere else, and are read per episode.
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('.rule-events');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('episode.id');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('Never write to an alert index');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain(
      'Cases are not read with a query but with a source'
    );
  });

  it('says what to do when no workflow does what a button needs: draft one under an id it chooses, and build the whole app', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('"workflowId" that you choose');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain(
      'build the whole app now, button or form included, and do not wait'
    );
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain(
      'Never use an id that is neither a workflow you found nor a draft you made'
    );
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('saving the draft is all that is left');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('You cannot save a workflow yourself');
  });

  it('no longer tells the agent to leave the button out and wait', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).not.toContain('do not add the button');
    expect(CUSTOM_APP_AUTHORING_GUIDE).not.toContain('wait for them to say it is saved');
  });

  it('says to look at the alert indices and fields first, since they differ', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain(
      'look at the indices and fields with the tools before you write a query, and never assume'
    );
  });

  it('teaches the cases source: its filters, the values of the app that can drive them, and its columns', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('"type": "cases"');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('"in-progress"');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('fromState');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('assignee_count');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('"count": true');
  });

  it('teaches forms: what they are for, how answers reach a workflow, and that they are not filters', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('"onSubmit"');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('"textarea"');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('only when it is submitted');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('hands them over with { "fromState": "<bind>" }');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('a form\'s "onSubmit"');
  });

  it('says a text is Markdown, and that a heading and a callout are not', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('A text is written in Markdown');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('so no Markdown in them');
  });

  it('teaches a select that takes its options from a query, and how an All option is kept', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('"optionsQuery"');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('whose first column is the value of each option');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('put an "All" option there');
  });

  it('teaches lists: the value type, the box, the multiple select, and how a query uses one', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('"list"');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('list_input');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('"multiple": true');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('WHERE user.name IN (?users)');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('Nothing written or chosen is an empty list');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('A list is not kept in the address of the page');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('makes a list of that one value');
  });

  it('teaches clicking a chart: the actions, the row behind a bar and how to get back', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain(
      'clicking a bar, a point or a slice runs the actions'
    );
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain(
      'a chart split by a series gives both the bar and the series'
    );
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('keep a way to clear the value');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('a chart\'s "onClick"');
  });

  it('teaches links: where they can go, that they stay in Kibana, and not to guess a path', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('"type": "discover"');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('"type": "custom_app"');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain(
      'A link stays inside Kibana and cannot go to another site'
    );
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('do not guess it');
  });

  it('teaches the theme: the accents, the shapes, and not to invent colours', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('"theme"');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain(
      '"blue" | "teal" | "purple" | "pink" | "orange" | "green" | "red"'
    );
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('"soft" | "sharp"');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain(
      'There are no other colours, fonts or sizes to choose'
    );
  });

  it('says that a component has a query or a source, not both, and that a chart cannot show cases', () => {
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('either a "query" or a "source", never both');
    expect(CUSTOM_APP_AUTHORING_GUIDE).toContain('A chart cannot show cases');
  });
});

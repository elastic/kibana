/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { showEuiComboBoxOptions } from '@elastic/eui/lib/test/rtl';
import { TemplateSelectorV2 } from './template_selector_v2';

const templates = [
  {
    templateId: 'tmpl-1',
    name: 'Template One',
    templateVersion: 1,
    owner: 'securitySolution',
    definition: '',
    definitionString: '',
    deletedAt: null,
    fieldSearchMatches: false,
  },
  {
    templateId: 'tmpl-2',
    name: 'Template Two',
    templateVersion: 3,
    owner: 'securitySolution',
    definition: '',
    definitionString: '',
    deletedAt: null,
    fieldSearchMatches: false,
  },
];

describe('TemplateSelectorV2', () => {
  let user: UserEvent;
  const onChange = jest.fn();

  beforeAll(() => jest.useFakeTimers());
  afterAll(() => jest.useRealTimers());

  beforeEach(() => {
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 });
    jest.clearAllMocks();
  });

  it('renders the combobox', async () => {
    render(
      <TemplateSelectorV2
        templateId={null}
        templates={templates}
        isLoadingTemplates={false}
        onChange={onChange}
      />
    );
    expect(await screen.findByTestId('cases-connector-template-v2-select')).toBeInTheDocument();
  });

  it('lists available templates', async () => {
    render(
      <TemplateSelectorV2
        templateId={null}
        templates={templates}
        isLoadingTemplates={false}
        onChange={onChange}
      />
    );
    await showEuiComboBoxOptions();
    expect(await screen.findByText('Template One')).toBeInTheDocument();
    expect(await screen.findByText('Template Two')).toBeInTheDocument();
  });

  it('calls onChange with templateId and templateVersion when a template is selected', async () => {
    render(
      <TemplateSelectorV2
        templateId={null}
        templates={templates}
        isLoadingTemplates={false}
        onChange={onChange}
      />
    );
    await showEuiComboBoxOptions();
    await user.click(await screen.findByText('Template Two'));
    expect(onChange).toHaveBeenCalledWith({ templateId: 'tmpl-2', templateVersion: '3' });
  });

  it('calls onChange with null/null when "No template selected" is chosen', async () => {
    render(
      <TemplateSelectorV2
        templateId="tmpl-1"
        templates={templates}
        isLoadingTemplates={false}
        onChange={onChange}
      />
    );
    await showEuiComboBoxOptions();
    await user.click(await screen.findByText('No template selected'));
    expect(onChange).toHaveBeenCalledWith({ templateId: null, templateVersion: null });
  });

  it('displays the selected v2 template by templateId', async () => {
    render(
      <TemplateSelectorV2
        templateId="tmpl-2"
        templates={templates}
        isLoadingTemplates={false}
        onChange={onChange}
      />
    );
    expect(await screen.findByRole('combobox')).toHaveValue('Template Two');
  });

  it('displays the migrated v2 template when the rule still stores a legacy template key', async () => {
    render(
      <TemplateSelectorV2
        templateId="legacy-key-1"
        templates={templates}
        isLoadingTemplates={false}
        legacyTemplates={[{ key: 'legacy-key-1', name: 'Template One' }]}
        onChange={onChange}
      />
    );
    expect(await screen.findByRole('combobox')).toHaveValue('Template One');
  });

  it('bridges a stored legacy key to the migrated template by its recorded legacyKey', async () => {
    // The migrated template carries the originating v1 key; its name may even differ from the v1
    // configure name. legacyKey must still resolve it (this is what disambiguates v1 duplicate names).
    const renamedTemplates = [
      {
        templateId: 'v2-x',
        name: 'Renamed In V2',
        templateVersion: 5,
        owner: 'securitySolution',
        definition: '',
        definitionString: '',
        deletedAt: null,
        fieldSearchMatches: false,
        legacyKey: 'old-key',
      },
    ];

    render(
      <TemplateSelectorV2
        templateId="old-key"
        templates={renamedTemplates}
        isLoadingTemplates={false}
        legacyTemplates={[{ key: 'old-key', name: 'Original V1 Name' }]}
        onChange={onChange}
      />
    );

    expect(await screen.findByRole('combobox')).toHaveValue('Renamed In V2');
  });

  it('bridges a legacy key whose name differs only by case/whitespace from the migrated template', async () => {
    render(
      <TemplateSelectorV2
        templateId="legacy-key-1"
        templates={templates}
        isLoadingTemplates={false}
        legacyTemplates={[{ key: 'legacy-key-1', name: '  template one  ' }]}
        onChange={onChange}
      />
    );
    expect(await screen.findByRole('combobox')).toHaveValue('Template One');
  });

  it('shows no selection when a stored legacy key has no migrated template', async () => {
    render(
      <TemplateSelectorV2
        templateId="legacy-key-unmapped"
        templates={templates}
        isLoadingTemplates={false}
        legacyTemplates={[{ key: 'legacy-key-unmapped', name: 'Nonexistent Template' }]}
        onChange={onChange}
      />
    );
    expect(await screen.findByRole('combobox')).toHaveValue('No template selected');
  });

  it('is disabled when isDisabled=true', async () => {
    render(
      <TemplateSelectorV2
        templateId={null}
        templates={templates}
        isLoadingTemplates={false}
        isDisabled={true}
        onChange={onChange}
      />
    );
    expect(await screen.findByRole('combobox')).toBeDisabled();
  });

  it('shows skeleton when templates are loading', async () => {
    render(
      <TemplateSelectorV2
        templateId={null}
        templates={[]}
        isLoadingTemplates={true}
        onChange={onChange}
      />
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

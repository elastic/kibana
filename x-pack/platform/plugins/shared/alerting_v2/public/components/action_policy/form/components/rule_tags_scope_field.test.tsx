/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { FormProvider, useForm } from 'react-hook-form';
import { DEFAULT_FORM_STATE } from '../constants';
import type { ActionPolicyFormState } from '../types';
import type { ActionPolicyPrototypeView } from './rule_tags_prototype_toggle';
import { RuleTagsScopeField } from './rule_tags_scope_field';

const mockUseFetchRuleTags = jest.fn();
const mockUseFetchRuleEventFields = jest.fn();

jest.mock('../../../../hooks/use_fetch_rule_tags', () => ({
  useFetchRuleTags: (...args: unknown[]) => mockUseFetchRuleTags(...args),
}));

jest.mock('../../../../hooks/use_fetch_rule_event_fields', () => ({
  useFetchRuleEventFields: (...args: unknown[]) => mockUseFetchRuleEventFields(...args),
}));

jest.mock('./matcher_input', () => ({
  MatcherInput: () => <input data-test-subj="matcherInput" readOnly />,
}));

const RuleTagsScopeFieldHarness = ({
  prototypeView = 'with_tags',
}: {
  prototypeView?: ActionPolicyPrototypeView;
}) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const methods = useForm<ActionPolicyFormState>({
    defaultValues: DEFAULT_FORM_STATE,
  });

  return (
    <I18nProvider>
      <FormProvider {...methods}>
        <RuleTagsScopeField
          selectedTags={selectedTags}
          onChangeTags={setSelectedTags}
          prototypeView={prototypeView}
        />
      </FormProvider>
    </I18nProvider>
  );
};

describe('RuleTagsScopeField', () => {
  beforeEach(() => {
    mockUseFetchRuleTags.mockReturnValue({ data: [], isLoading: false });
    mockUseFetchRuleEventFields.mockReturnValue({ data: [], isLoading: false });
  });

  it('shows the searchable field with add placeholder when no tags exist in the space', () => {
    render(<RuleTagsScopeFieldHarness prototypeView="empty" />);

    expect(screen.getByTestId('ruleTagsEmptyState')).toBeInTheDocument();
    expect(screen.getByTestId('ruleTagsSearch')).toHaveAttribute(
      'placeholder',
      'Add custom rule tag'
    );
    expect(screen.getByTestId('ruleTagsSelectable')).toBeInTheDocument();
  });

  it('adds a tag from the search field', async () => {
    const user = userEvent.setup();
    render(<RuleTagsScopeFieldHarness prototypeView="empty" />);

    await user.type(screen.getByTestId('ruleTagsSearch'), 'production{enter}');

    expect(await screen.findByText('production')).toBeInTheDocument();
  });

  it('shows the selectable list when rule tags exist in the space', () => {
    render(<RuleTagsScopeFieldHarness prototypeView="with_tags" />);

    expect(screen.getByTestId('ruleTagsSelectable')).toBeInTheDocument();
    expect(screen.getByTestId('ruleTagsSearch')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleTagsAddInput')).not.toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleTagsEmptyState')).not.toBeInTheDocument();
  });

  it('uses Search or add rule tags for the selectable search input', () => {
    render(<RuleTagsScopeFieldHarness prototypeView="with_tags" />);

    expect(screen.getByTestId('ruleTagsSearch')).toHaveAttribute(
      'placeholder',
      'Search or add rule tags'
    );
  });

  it('shows custom tags under Other when they are not on a rule', async () => {
    const user = userEvent.setup();
    render(<RuleTagsScopeFieldHarness prototypeView="with_tags" />);

    await user.type(screen.getByTestId('ruleTagsSearch'), 'custom-tag{enter}');

    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(await screen.findByText('custom-tag')).toBeInTheDocument();
  });

  it('shows mock tags for the notification controls prototype view', () => {
    render(<RuleTagsScopeFieldHarness prototypeView="notification_controls" />);

    expect(screen.getByTestId('ruleTagsSelectable')).toBeInTheDocument();
    expect(screen.queryByTestId('ruleTagsEmptyState')).not.toBeInTheDocument();
  });
});

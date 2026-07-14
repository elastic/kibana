/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CaseSeverity } from '../../../../common/types/domain';
import type { ParsedTemplateDefinition } from '../../../../common/types/domain/template/v1';
import { TemplateCaseDefaultsForm } from './template_case_defaults_form';

jest.mock('../../cases_context/use_cases_context', () => ({
  useCasesContext: () => ({ owner: ['securitySolution'] }),
}));

jest.mock('../../app/use_available_owners', () => ({
  useAvailableCasesOwners: () => ['securitySolution'],
}));

jest.mock('../../../common/use_is_user_typing', () => ({
  useIsUserTyping: () => ({
    isUserTyping: false,
    onContentChange: jest.fn(),
    onDebounce: jest.fn(),
  }),
}));

jest.mock('../../../containers/user_profiles/use_suggest_user_profiles', () => ({
  useSuggestUserProfiles: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
  }),
}));

jest.mock('../../../containers/user_profiles/use_bulk_get_user_profiles', () => ({
  useBulkGetUserProfiles: () => ({
    data: new Map(),
    isFetching: false,
  }),
}));

jest.mock('../hooks/use_get_template_tags', () => ({
  useGetTemplateTags: () => ({ data: [] }),
}));

jest.mock('../../../containers/use_get_categories', () => ({
  useGetCategories: () => ({ data: [], isLoading: false }),
}));

describe('TemplateCaseDefaultsForm', () => {
  const baseTemplate: ParsedTemplateDefinition = {
    name: 'Case default title',
    fields: [],
  };

  it('renders only the canonical severities — no empty / "null" option', () => {
    render(<TemplateCaseDefaultsForm parsedTemplate={baseTemplate} />);

    const severitySelect = screen.getByTestId('caseDefaultsSeverityInput');
    const options = within(severitySelect).getAllByRole('option');
    const optionValues = options.map((option) => option.getAttribute('value'));

    // Severity always has a concrete value: only the real severities, no empty/"null" option.
    expect(optionValues).toEqual([
      CaseSeverity.LOW,
      CaseSeverity.MEDIUM,
      CaseSeverity.HIGH,
      CaseSeverity.CRITICAL,
    ]);
    expect(optionValues).not.toContain('');
    expect(optionValues).not.toContain('null');
  });

  it('defaults severity to "low" when the template does not specify one', () => {
    render(<TemplateCaseDefaultsForm parsedTemplate={baseTemplate} />);

    expect(screen.getByTestId('caseDefaultsSeverityInput')).toHaveValue(CaseSeverity.LOW);
  });

  it('propagates severity changes from the select input', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();

    render(<TemplateCaseDefaultsForm parsedTemplate={baseTemplate} onChange={onChange} />);

    await user.selectOptions(screen.getByTestId('caseDefaultsSeverityInput'), CaseSeverity.HIGH);

    expect(onChange).toHaveBeenCalledWith('severity', CaseSeverity.HIGH);
  });
});

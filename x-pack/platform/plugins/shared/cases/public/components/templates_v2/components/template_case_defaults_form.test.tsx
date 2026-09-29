/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithTestingProviders } from '../../../common/mock';
import { CaseSeverity } from '../../../../common/types/domain';
import type { ParsedTemplateDefinition } from '../../../../common/types/domain/template/v1';
import { TemplateCaseDefaultsForm } from './template_case_defaults_form';

vi.mock('../../cases_context/use_cases_context', () => {
      const mocked = {
      useCasesContext: () => ({ owner: ['securitySolution'] }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../app/use_available_owners', () => {
      const mocked = {
      useAvailableCasesOwners: () => ['securitySolution'],
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../common/use_is_user_typing', () => {
      const mocked = {
      useIsUserTyping: () => ({
        isUserTyping: false,
        onContentChange: vi.fn(),
        onDebounce: vi.fn(),
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../containers/user_profiles/use_suggest_user_profiles', () => {
      const mocked = {
      useSuggestUserProfiles: () => ({
        data: [],
        isLoading: false,
        isFetching: false,
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../containers/user_profiles/use_bulk_get_user_profiles', () => {
      const mocked = {
      useBulkGetUserProfiles: () => ({
        data: new Map(),
        isFetching: false,
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../hooks/use_get_template_tags', () => {
      const mocked = {
      useGetTemplateTags: () => ({ data: [] }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../containers/use_get_categories', () => {
      const mocked = {
      useGetCategories: () => ({ data: [], isLoading: false }),
    };
      return { ...mocked, default: mocked };
    });

describe('TemplateCaseDefaultsForm', () => {
  const baseTemplate: ParsedTemplateDefinition = {
    name: 'Case default title',
    fields: [],
  };

  it('renders the case-default description in a markdown editor populated with the template markdown', () => {
    const markdownDescription = '# Runbook\n\n1. Review the **source** host';

    renderWithTestingProviders(
      <TemplateCaseDefaultsForm
        parsedTemplate={{ ...baseTemplate, description: markdownDescription }}
      />
    );

    // EuiMarkdownEditor renders a real textarea inside its container, confirming the default
    // description is an editable markdown field rather than a plain textarea.
    const editorContainer = screen.getByTestId('caseDefaultsDescriptionInput');
    const textarea = within(editorContainer).getByRole('textbox');
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveValue(markdownDescription);
  });

  it('renders only the canonical severities — no empty / "null" option', () => {
    renderWithTestingProviders(<TemplateCaseDefaultsForm parsedTemplate={baseTemplate} />);

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
    renderWithTestingProviders(<TemplateCaseDefaultsForm parsedTemplate={baseTemplate} />);

    expect(screen.getByTestId('caseDefaultsSeverityInput')).toHaveValue(CaseSeverity.LOW);
  });

  it('propagates severity changes from the select input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    renderWithTestingProviders(
      <TemplateCaseDefaultsForm parsedTemplate={baseTemplate} onChange={onChange} />
    );

    await user.selectOptions(screen.getByTestId('caseDefaultsSeverityInput'), CaseSeverity.HIGH);

    expect(onChange).toHaveBeenCalledWith('severity', CaseSeverity.HIGH);
  });
});

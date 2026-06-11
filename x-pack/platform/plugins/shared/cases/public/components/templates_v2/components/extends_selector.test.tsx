/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { EuiComboBoxProps, EuiComboBoxOptionOption } from '@elastic/eui';
import { ExtendsSelector } from './extends_selector';

// Capture EuiComboBox props (selectedOptions, onChange) without needing the full EUI stack.
const capturedComboBoxProps: Array<EuiComboBoxProps<string>> = [];

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiComboBox: (props: EuiComboBoxProps<string>) => {
      capturedComboBoxProps.push(props);
      return (
        <div data-test-subj={props['data-test-subj']}>
          {(props.selectedOptions ?? []).map((o: EuiComboBoxOptionOption<string>) => (
            <span key={o.value}>{o.label}</span>
          ))}
          <input
            data-testid="combo-input"
            onChange={() => {}}
            onClick={() => props.onChange?.([])}
          />
        </div>
      );
    },
  };
});

jest.mock('../../cases_context/use_cases_context', () => ({
  useCasesContext: () => ({ owner: ['securitySolution'] }),
}));

jest.mock('../../../common/navigation/hooks', () => ({
  useCasesEditTemplateNavigation: () => ({
    getCasesEditTemplateUrl: ({ templateId }: { templateId: string }) =>
      `/app/security/cases/templates/${templateId}/edit`,
  }),
}));

jest.mock('../hooks/use_get_templates');
jest.mock('../hooks/use_get_template');

import { useGetTemplates } from '../hooks/use_get_templates';
import { useGetTemplate } from '../hooks/use_get_template';
import type { ParsedTemplate } from '../../../../common/types/domain/template/v1';

const mockUseGetTemplates = useGetTemplates as jest.MockedFunction<typeof useGetTemplates>;
const mockUseGetTemplate = useGetTemplate as jest.MockedFunction<typeof useGetTemplate>;

const PARENT_ID = 'parent-template-uuid';

const makeTemplate = (id: string, name: string): ParsedTemplate => ({
  templateId: id,
  name,
  owner: 'securitySolution',
  definition: { name, fields: [] },
  definitionString: `name: ${name}\nfields: []\n`,
  templateVersion: 3,
  deletedAt: null,
  isLatest: true,
  latestVersion: 3,
});

const defaultProps = {
  yamlValue: '',
  onYamlChange: jest.fn(),
};

describe('ExtendsSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedComboBoxProps.length = 0;
    mockUseGetTemplates.mockReturnValue({
      data: { templates: [makeTemplate(PARENT_ID, 'Parent Template')], total: 1 },
      isLoading: false,
    } as ReturnType<typeof useGetTemplates>);
    mockUseGetTemplate.mockReturnValue({
      data: undefined,
      isError: false,
      isFetched: true,
    } as ReturnType<typeof useGetTemplate>);
  });

  describe('combobox selection with version-pinned extends ref', () => {
    it('strips @version from the extends ref so the combobox selectedOptions uses the bare id', () => {
      // YAML has a version-pinned ref: extends: <id>@3
      // The combobox options use bare templateId values, so selectedOptions must
      // match on the stripped templateId — not on the raw `id@3` string.
      render(
        <ExtendsSelector {...defaultProps} yamlValue={`name: Child\nextends: ${PARENT_ID}@3\n`} />
      );

      const lastProps = capturedComboBoxProps.at(-1);
      expect(lastProps?.selectedOptions).toHaveLength(1);
      // The selected option value is the bare templateId (no @3).
      expect(lastProps?.selectedOptions?.[0].value).toBe(PARENT_ID);
      expect(lastProps?.selectedOptions?.[0].label).toBe('Parent Template');
    });

    it('shows the clean templateId in the "View parent" link href (no @version suffix)', () => {
      render(
        <ExtendsSelector {...defaultProps} yamlValue={`name: Child\nextends: ${PARENT_ID}@3\n`} />
      );

      const link = screen.getByTestId('template-extends-view-link');
      expect(link).toHaveAttribute('href', expect.stringContaining(PARENT_ID));
      expect(link).not.toHaveAttribute('href', expect.stringContaining('@3'));
    });
  });

  describe('deleted-parent fallback with version-pinned extends ref', () => {
    it('passes the pinned version to useGetTemplate for the deleted-parent fallback', () => {
      // When the parent is not in the options list (deleted/disabled), the component
      // fetches it directly to get a display label. It should pass the pinned version.
      mockUseGetTemplates.mockReturnValue({
        data: { templates: [], total: 0 }, // parent not in list
        isLoading: false,
      } as ReturnType<typeof useGetTemplates>);

      render(
        <ExtendsSelector {...defaultProps} yamlValue={`name: Child\nextends: ${PARENT_ID}@2\n`} />
      );

      expect(mockUseGetTemplate).toHaveBeenCalledWith(
        PARENT_ID,
        2,
        expect.objectContaining({ silent: true, includeDeleted: true })
      );
    });
  });

  describe('handleChange — picking a parent via combobox resets to latest', () => {
    it('writes a bare templateId (no version) when a parent is picked from the combobox', () => {
      const onYamlChange = jest.fn();

      render(
        <ExtendsSelector
          yamlValue={`name: Child\nextends: ${PARENT_ID}@3\n`}
          onYamlChange={onYamlChange}
        />
      );

      // Simulate the combobox onChange callback with the picked option.
      const lastProps = capturedComboBoxProps.at(-1);
      lastProps?.onChange?.([{ label: 'Parent Template', value: PARENT_ID }]);

      expect(onYamlChange).toHaveBeenCalledTimes(1);
      const writtenYaml: string = onYamlChange.mock.calls[0][0];
      // Must write a bare templateId — no @version suffix (picking resets to latest).
      expect(writtenYaml).toContain(`extends: ${PARENT_ID}`);
      expect(writtenYaml).not.toMatch(/@\d+/);
    });
  });
});

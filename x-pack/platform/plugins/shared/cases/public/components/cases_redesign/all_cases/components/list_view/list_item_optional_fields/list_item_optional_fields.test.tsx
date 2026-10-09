/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { CustomFieldTypes } from '../../../../../../../common/types/domain';
import { FieldType } from '../../../../../../../common/types/domain/template/fields';
import { renderWithTestingProviders } from '../../../../../../common/mock';
import { basicCase } from '../../../../../../containers/mock';
import { useCasesConfig } from '../../../../../../common/lib/kibana';
import { useGlobalInlineFields } from '../../../../../all_cases/hooks/use_global_inline_fields';
import { ListItemOptionalFields } from './list_item_optional_fields';
import * as i18n from '../../../translations';

jest.mock('../../../../../../common/lib/kibana', () => ({
  ...jest.requireActual('../../../../../../common/lib/kibana'),
  useCasesConfig: jest.fn(),
}));
jest.mock('../../../../../all_cases/hooks/use_global_inline_fields', () => ({
  ...jest.requireActual('../../../../../all_cases/hooks/use_global_inline_fields'),
  useGlobalInlineFields: jest.fn(),
}));

const useCasesConfigMock = useCasesConfig as jest.Mock;
const useGlobalInlineFieldsMock = useGlobalInlineFields as jest.Mock;

describe('ListItemOptionalFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useCasesConfigMock.mockReturnValue({ templatesEnabled: false });
    useGlobalInlineFieldsMock.mockReturnValue({ globalInlineFields: [], isLoading: false });
  });

  it('returns null when no fields are checked', () => {
    const { container } = renderWithTestingProviders(
      <ListItemOptionalFields
        theCase={basicCase}
        selectedFields={[{ field: 'tags', name: i18n.TAGS, isChecked: false }]}
        userProfiles={new Map()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders field content when fields are checked', () => {
    renderWithTestingProviders(
      <ListItemOptionalFields
        theCase={{ ...basicCase, tags: ['coke', 'pepsi'] }}
        selectedFields={[{ field: 'tags', name: i18n.TAGS, isChecked: true }]}
        userProfiles={new Map()}
      />
    );

    expect(screen.getByTestId('cases-list-item-optional-fields')).toBeInTheDocument();
    expect(screen.getByTestId('cases-list-item-field-tags')).toHaveTextContent('Tags: coke, pepsi');
  });

  it('renders custom field values when checked', () => {
    renderWithTestingProviders(
      <ListItemOptionalFields
        theCase={{
          ...basicCase,
          customFields: [{ key: 'priority', value: 'high', type: CustomFieldTypes.TEXT }],
        }}
        selectedFields={[{ field: 'priority', name: 'Priority', isChecked: true }]}
        userProfiles={new Map()}
      />
    );

    expect(screen.getByTestId('cases-list-item-field-priority')).toHaveTextContent(
      'Priority: high'
    );
  });

  it('renders extended field values from extendedFields when templates v2 is enabled', () => {
    useCasesConfigMock.mockReturnValue({ templatesEnabled: true });
    useGlobalInlineFieldsMock.mockReturnValue({
      globalInlineFields: [
        { name: 'priority', type: 'keyword', control: FieldType.INPUT_TEXT, label: 'Priority' },
      ],
      isLoading: false,
    });

    renderWithTestingProviders(
      <ListItemOptionalFields
        theCase={{ ...basicCase, extendedFields: { priorityAsKeyword: 'high' } } as never}
        selectedFields={[{ field: 'priority_as_keyword', name: 'Priority', isChecked: true }]}
        userProfiles={new Map()}
      />
    );

    expect(screen.getByTestId('cases-list-item-field-priority_as_keyword')).toHaveTextContent(
      'Priority: high'
    );
  });

  it('omits an extended field with no stored value', () => {
    useCasesConfigMock.mockReturnValue({ templatesEnabled: true });
    useGlobalInlineFieldsMock.mockReturnValue({
      globalInlineFields: [
        { name: 'priority', type: 'keyword', control: FieldType.INPUT_TEXT, label: 'Priority' },
      ],
      isLoading: false,
    });

    const { container } = renderWithTestingProviders(
      <ListItemOptionalFields
        theCase={{ ...basicCase, extendedFields: {} } as never}
        selectedFields={[{ field: 'priority_as_keyword', name: 'Priority', isChecked: true }]}
        userProfiles={new Map()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders avatars for a user-picker extended field using the resolved profile', () => {
    useCasesConfigMock.mockReturnValue({ templatesEnabled: true });
    useGlobalInlineFieldsMock.mockReturnValue({
      globalInlineFields: [
        {
          name: 'reviewers',
          type: 'keyword',
          control: FieldType.USER_PICKER,
          label: 'Reviewers',
        },
      ],
      isLoading: false,
    });

    const uid = 'u_J41Oh6L9ki-Vo2tOogS8WRTENzhHurGtRc87NgEAlkc_0';
    const userProfiles = new Map([
      [
        uid,
        {
          uid,
          enabled: true,
          data: {},
          user: {
            username: 'damaged_raccoon',
            email: 'damaged_raccoon@elastic.co',
            full_name: 'Damaged Raccoon',
          },
        },
      ],
    ]) as never;

    renderWithTestingProviders(
      <ListItemOptionalFields
        theCase={
          {
            ...basicCase,
            extendedFields: {
              reviewersAsKeyword: JSON.stringify([{ uid, name: 'stale name' }]),
            },
          } as never
        }
        selectedFields={[{ field: 'reviewers_as_keyword', name: 'Reviewers', isChecked: true }]}
        userProfiles={userProfiles}
      />
    );

    expect(screen.getByTestId('cases-list-item-field-reviewers_as_keyword')).toBeInTheDocument();
    expect(screen.getByText('DR')).toBeInTheDocument();
  });
});

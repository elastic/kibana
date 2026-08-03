/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { CustomFieldTypes } from '../../../../../../../common/types/domain';
import { renderWithTestingProviders } from '../../../../../../common/mock';
import { basicCase } from '../../../../../../containers/mock';
import { ListItemOptionalFields } from './list_item_optional_fields';
import * as i18n from '../../../translations';

describe('ListItemOptionalFields', () => {
  it('returns null when no fields are checked', () => {
    const { container } = renderWithTestingProviders(
      <ListItemOptionalFields
        theCase={basicCase}
        selectedFields={[{ field: 'tags', name: i18n.TAGS, isChecked: false }]}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders field content when fields are checked', () => {
    renderWithTestingProviders(
      <ListItemOptionalFields
        theCase={{ ...basicCase, tags: ['coke', 'pepsi'] }}
        selectedFields={[{ field: 'tags', name: i18n.TAGS, isChecked: true }]}
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
      />
    );

    expect(screen.getByTestId('cases-list-item-field-priority')).toHaveTextContent(
      'Priority: high'
    );
  });
});

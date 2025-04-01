/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AssistantTitle } from '.';
import { TestProviders } from '../../mock/test_providers/test_providers';

const testProps = {
  title: 'Test Title',
  docLinks: { ELASTIC_WEBSITE_URL: 'https://www.elastic.co/', DOC_LINK_VERSION: '7.15' },
  selectedConversation: undefined,
  onChange: jest.fn(),
  refetchCurrentUserConversations: jest.fn(),
};

describe('AssistantTitle', () => {
  it('the component renders correctly with valid props', () => {
    const { getByText } = render(
      <TestProviders>
        <AssistantTitle {...testProps} />
      </TestProviders>
    );
    expect(getByText('Test Title')).toBeInTheDocument();
  });
});

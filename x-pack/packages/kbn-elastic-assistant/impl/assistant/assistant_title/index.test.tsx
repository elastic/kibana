/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { AssistantTitle } from '.';
import { TestProviders } from '../../mock/test_providers/test_providers';

const testProps = {
  title: 'Test Title',
  titleIcon: 'globe',
  docLinks: { ELASTIC_WEBSITE_URL: 'https://www.elastic.co/', DOC_LINK_VERSION: '7.15' },
  selectedConversation: undefined,
};

describe('AssistantTitle', () => {
  it('the component renders correctly with valid props', () => {
    const { getByText, container } = render(
      <TestProviders>
        <AssistantTitle {...testProps} />
      </TestProviders>
    );
    expect(getByText('Test Title')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="globe"]')).not.toBeNull();
  });

  it('clicking on the popover button opens the popover with the correct link', () => {
    const { getByTestId, queryByTestId } = render(
      <TestProviders>
        <AssistantTitle {...testProps} />
      </TestProviders>,
      {
        wrapper: TestProviders,
      }
    );
    expect(queryByTestId('tooltipContent')).not.toBeInTheDocument();
    fireEvent.click(getByTestId('tooltipIcon'));
    expect(getByTestId('tooltipContent')).toBeInTheDocument();
    expect(getByTestId('externalDocumentationLink')).toHaveAttribute(
      'href',
      'https://www.elastic.co/guide/en/security/7.15/security-assistant.html'
    );
  });
});

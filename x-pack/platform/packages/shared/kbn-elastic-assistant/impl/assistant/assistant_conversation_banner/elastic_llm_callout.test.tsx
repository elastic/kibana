/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { ElasticLlmCallout } from './elastic_llm_callout';
import { TestProviders } from '../../mock/test_providers/test_providers';

jest.mock('react-use/lib/useLocalStorage');

describe('ElasticLlmCallout', () => {
  const defaultProps = {
    showEISCallout: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalStorage as jest.Mock).mockReturnValue([false, jest.fn()]);
  });

  it('should not render when showEISCallout is false', () => {
    const { queryByTestId } = render(<ElasticLlmCallout showEISCallout={false} />, {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });
    expect(queryByTestId('elasticLlmCallout')).not.toBeInTheDocument();
  });

  it('should not render when tour is completed', () => {
    (useLocalStorage as jest.Mock).mockReturnValue([true, jest.fn()]);
    const { queryByTestId } = render(
      <TestProviders>
        <ElasticLlmCallout {...defaultProps} />
      </TestProviders>,
      {
        wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
      }
    );

    expect(queryByTestId('elasticLlmCallout')).not.toBeInTheDocument();
  });

  it('should render links', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <ElasticLlmCallout {...defaultProps} />
      </TestProviders>,
      { wrapper: ({ children }) => <TestProviders>{children}</TestProviders> }
    );
    expect(queryByTestId('elasticLlmUsageCostLink')).toHaveTextContent('additional costs incur');
    expect(queryByTestId('elasticLlmConnectorLink')).toHaveTextContent('connector');
  });

  it('should show callout when showEISCallout changes to true', () => {
    const { rerender, queryByTestId } = render(
      <TestProviders>
        <ElasticLlmCallout showEISCallout={false} />
      </TestProviders>,
      { wrapper: ({ children }) => <TestProviders>{children}</TestProviders> }
    );
    expect(queryByTestId('elasticLlmCallout')).not.toBeInTheDocument();

    rerender(<ElasticLlmCallout showEISCallout={true} />);
    expect(queryByTestId('elasticLlmCallout')).toBeInTheDocument();
  });
});

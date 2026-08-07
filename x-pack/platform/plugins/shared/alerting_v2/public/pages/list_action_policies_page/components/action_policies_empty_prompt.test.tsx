/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionPoliciesEmptyPrompt } from './action_policies_empty_prompt';

describe('ActionPoliciesEmptyPrompt', () => {
  it('renders title, description, create button, and docs footer when the user can write', async () => {
    const onCreate = jest.fn();
    const user = userEvent.setup();

    render(<ActionPoliciesEmptyPrompt canWrite={true} onCreate={onCreate} />);

    expect(screen.getByTestId('actionPoliciesEmptyPrompt')).toBeInTheDocument();
    expect(screen.getByText('Centralize your notifications')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Create Action Policies to manage notification destinations once and reuse them across your rules.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Want to learn more?')).toBeInTheDocument();
    expect(screen.getByTestId('actionPoliciesEmptyPromptDocsLink')).toHaveAttribute(
      'href',
      'https://www.elastic.co/docs/explore-analyze/alerts-cases/alerts'
    );

    await user.click(screen.getByTestId('actionPoliciesEmptyPromptCreateButton'));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('hides the create button when the user cannot write', () => {
    render(<ActionPoliciesEmptyPrompt canWrite={false} onCreate={jest.fn()} />);

    expect(screen.queryByTestId('actionPoliciesEmptyPromptCreateButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('actionPoliciesEmptyPromptDocsLink')).toBeInTheDocument();
  });
});

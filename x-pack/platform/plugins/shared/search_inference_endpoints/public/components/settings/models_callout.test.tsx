/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ModelsCallout } from './models_callout';

describe('ModelsCallout', () => {
  it('renders title, message, and one <li> per model', () => {
    render(
      <ModelsCallout
        title="Some models are deprecated"
        message="Update them before EOL."
        modelList={['Claude 2', 'GPT-4o']}
        data-test-subj="testCallout"
      />
    );

    const callout = screen.getByTestId('testCallout');
    expect(callout).toBeInTheDocument();
    expect(callout).toHaveTextContent('Some models are deprecated');
    expect(callout).toHaveTextContent('Update them before EOL.');

    const items = callout.querySelectorAll('li');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Claude 2');
    expect(items[1]).toHaveTextContent('GPT-4o');
  });

  it('renders an empty list when modelList is empty', () => {
    render(
      <ModelsCallout title="Title" message="Message" modelList={[]} data-test-subj="emptyCallout" />
    );

    const callout = screen.getByTestId('emptyCallout');
    expect(callout.querySelectorAll('li')).toHaveLength(0);
  });

  it('defaults to the warning color when no color prop is provided', () => {
    render(
      <ModelsCallout
        title="Default color"
        message="m"
        modelList={[]}
        data-test-subj="defaultCallout"
      />
    );

    const callout = screen.getByTestId('defaultCallout');
    expect(callout.className).toMatch(/warning/i);
  });

  it('uses the provided color when overridden', () => {
    render(
      <ModelsCallout
        title="Danger"
        message="m"
        modelList={[]}
        color="danger"
        data-test-subj="dangerCallout"
      />
    );

    const callout = screen.getByTestId('dangerCallout');
    expect(callout.className).toMatch(/danger/i);
    expect(callout.className).not.toMatch(/warning/i);
  });
});

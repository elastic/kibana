/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EvaluatorModelsBadge } from '.';

describe('EvaluatorModelsBadge', () => {
  it('names the judge when every evaluator shared one', () => {
    render(<EvaluatorModelsBadge models={[{ id: 'gpt-4o' }, { id: 'gpt-4o' }]} />);

    expect(screen.getByText('gpt-4o')).toBeInTheDocument();
  });

  it('counts the judges when evaluators differ, behind a focusable tooltip anchor', () => {
    render(<EvaluatorModelsBadge models={[{ id: 'gpt-4o' }, { id: 'claude-3' }]} />);

    const badge = screen.getByText('2 models');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('[tabindex="0"]')).toBeInTheDocument();
  });

  it('reports no judge for an experiment scored only by code evaluators', () => {
    render(<EvaluatorModelsBadge models={[]} />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });
});

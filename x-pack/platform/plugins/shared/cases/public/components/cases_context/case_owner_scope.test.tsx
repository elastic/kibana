/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { CaseOwnerScope } from './case_owner_scope';
import { useCasesContext } from './use_cases_context';

const OwnerProbe = () => {
  const { owner } = useCasesContext();
  return <span data-test-subj="owner">{owner.join(',')}</span>;
};

describe('CaseOwnerScope', () => {
  it("scopes an ownerless context to the case's owner", () => {
    render(
      <TestProviders owner={[]}>
        <CaseOwnerScope caseOwner="observability">
          <OwnerProbe />
        </CaseOwnerScope>
      </TestProviders>
    );

    expect(screen.getByTestId('owner')).toHaveTextContent('observability');
  });

  it('leaves a context that already has an owner alone', () => {
    render(
      <TestProviders owner={['securitySolution']}>
        <CaseOwnerScope caseOwner="observability">
          <OwnerProbe />
        </CaseOwnerScope>
      </TestProviders>
    );

    expect(screen.getByTestId('owner')).toHaveTextContent('securitySolution');
  });
});

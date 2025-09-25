/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { screen } from '@testing-library/react';
import { UserActionActions } from '../../../common/types/domain';

import { renderWithTestingProviders } from '../../common/mock';
import { getUserAction } from '../../containers/mock';
import { getMockBuilderArgs } from './mock';
import { createObservablesUserActionBuilder } from './observables';
import type { ObservablesActionType } from '../../../common/types/domain/user_action/observables/v1';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createObservablesUserActionBuilder ', () => {
  const builderArgs = getMockBuilderArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const tests: [number, ObservablesActionType, string][] = [
    [1, 'add', 'added an observable'],
    [1, 'delete', 'deleted an observable'],
    [1, 'update', 'updated an observable'],
    [10, 'add', 'added 10 observables'],
  ];

  it.each(tests)(
    'renders correctly when changed observables to %s',
    async (count, actionType, label) => {
      const userAction = getUserAction('observables', UserActionActions.update, {
        payload: { observables: { count, actionType } },
      });
      const builder = createObservablesUserActionBuilder({
        ...builderArgs,
        userAction,
      });

      const createdUserAction = builder.build();
      renderWithTestingProviders(<EuiCommentList comments={createdUserAction} />);

      expect(screen.getByTestId(`observables-${actionType}-action`)).toHaveTextContent(label);
    }
  );
});

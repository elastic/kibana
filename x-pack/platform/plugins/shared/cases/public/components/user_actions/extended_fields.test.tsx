/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCommentList } from '@elastic/eui';
import { screen } from '@testing-library/react';

import { getUserAction } from '../../containers/mock';
import { renderWithTestingProviders } from '../../common/mock';
import { createExtendedFieldsUserActionBuilder } from './extended_fields';
import { getMockBuilderArgs } from './mock';
import { UserActionActions } from '../../../common/types/domain';

jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');

describe('createExtendedFieldsUserActionBuilder', () => {
  const builderArgs = getMockBuilderArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders field name and value when a single field is updated', () => {
    // Keys arrive camelCase after convertToCamelCase (e.g. risk_score_as_keyword → riskScoreAsKeyword)
    const userAction = getUserAction('extended_fields', UserActionActions.update, {
      type: 'extended_fields',
      payload: { extendedFields: { riskScoreAsKeyword: 'high' } },
    });

    const builder = createExtendedFieldsUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    renderWithTestingProviders(<EuiCommentList comments={createdUserAction} />);

    expect(screen.getByText('set Risk Score to high')).toBeInTheDocument();
  });

  it('renders generic label when multiple fields are updated at once', () => {
    const userAction = getUserAction('extended_fields', UserActionActions.update, {
      type: 'extended_fields',
      payload: {
        extendedFields: {
          riskScoreAsKeyword: 'high',
          affectedSystemsAsKeyword: 'web-server',
        },
      },
    });

    const builder = createExtendedFieldsUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    renderWithTestingProviders(<EuiCommentList comments={createdUserAction} />);

    expect(screen.getByText('updated template fields')).toBeInTheDocument();
  });
});

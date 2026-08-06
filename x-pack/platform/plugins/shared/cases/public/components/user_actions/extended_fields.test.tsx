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

  it('resolves a migrated custom field uuid key to its configured label', () => {
    // Migrated custom fields are stored under `${customFieldKey}_as_<type>`; the camelCased
    // payload key (testKey1AsKeyword) must map back to the configured label, not startCase(key).
    const userAction = getUserAction('extended_fields', UserActionActions.update, {
      type: 'extended_fields',
      payload: { extendedFields: { testKey1AsKeyword: 'migrated value' } },
    });

    const builder = createExtendedFieldsUserActionBuilder({
      ...builderArgs,
      userAction,
    });

    const createdUserAction = builder.build();
    renderWithTestingProviders(<EuiCommentList comments={createdUserAction} />);

    expect(screen.getByText('set My test label 1 to migrated value')).toBeInTheDocument();
  });

  it('resolves a non-migrated global/template field key to its enriched label', () => {
    // A natively-authored field (name: new_field, label: "My Field") is not in the customFields
    // config; its label must come from the case's server-enriched extendedFieldsLabels
    // (keyed by snake storage key `new_field_as_keyword`), not startCase("newField") → "New Field".
    const userAction = getUserAction('extended_fields', UserActionActions.update, {
      type: 'extended_fields',
      payload: { extendedFields: { newFieldAsKeyword: 'yo' } },
    });

    const builder = createExtendedFieldsUserActionBuilder({
      ...builderArgs,
      caseData: {
        ...builderArgs.caseData,
        extendedFieldsLabels: { new_field_as_keyword: 'My Field' },
      },
      userAction,
    });

    const createdUserAction = builder.build();
    renderWithTestingProviders(<EuiCommentList comments={createdUserAction} />);

    expect(screen.getByText('set My Field to yo')).toBeInTheDocument();
  });

  it('renders one row per field when several are updated at once', () => {
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

    // A section save writes every changed field in one request, but the history reads as "what
    // changed" — one line per field, the same as editing a field on its own. Sorted by label.
    expect(createdUserAction).toHaveLength(2);
    expect(screen.getByText('set Affected Systems to web-server')).toBeInTheDocument();
    expect(screen.getByText('set Risk Score to high')).toBeInTheDocument();
    expect(screen.queryByText('updated template fields')).not.toBeInTheDocument();
  });

  it('keeps a single copy link across the rows of one multi-field update', () => {
    const userAction = getUserAction('extended_fields', UserActionActions.update, {
      type: 'extended_fields',
      payload: {
        extendedFields: {
          riskScoreAsKeyword: 'high',
          affectedSystemsAsKeyword: 'web-server',
        },
      },
    });

    const createdUserAction = createExtendedFieldsUserActionBuilder({
      ...builderArgs,
      userAction,
    }).build();

    // One user action behind the rows means one permalink; repeating it would duplicate DOM ids.
    expect(createdUserAction[0].actions).toBeDefined();
    expect(createdUserAction[1].actions).toBeUndefined();
  });
});

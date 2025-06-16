/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';

import { OsqueryActionResults } from './osquery_results';
import { queryClient } from '../../query_client';
import { useKibana } from '../../common/lib/kibana';
import * as useLiveQueryDetails from '../../actions/use_live_query_details';
import { PERMISSION_DENIED } from '../osquery_action/translations';
import * as privileges from '../../action_results/use_action_privileges';
import { defaultLiveQueryDetails, DETAILS_QUERY, getMockedKibanaConfig } from './test_utils';
import type { OsqueryActionResultsProps } from './types';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const enablePrivileges = () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  jest.spyOn(privileges, 'useActionResultsPrivileges').mockImplementation(() => ({
    data: true,
  }));
};

const defaultProps: OsqueryActionResultsProps = {
  ruleName: 'Test-rule',
  actionItems: [
    {
      _id: 'test',
      _index: 'test',
      fields: {
        action_id: ['testActionId'],
        'queries.action_id': ['queriesActionId'],
        'queries.query': [DETAILS_QUERY],
        '@timestamp': ['2022-09-08T18:16:30.256Z'],
      },
    },
  ],
  ecsData: {
    _id: 'test',
    _index: 'test',
  },
};

const defaultPermissions = {
  osquery: {
    read: true,
    runSavedQueries: false,
    readSavedQueries: false,
  },
  discover_v2: {
    show: true,
  },
};

const mockKibana = (permissionType: unknown = defaultPermissions) => {
  const mockedKibana = getMockedKibanaConfig(permissionType);
  useKibanaMock.mockReturnValue(mockedKibana);
};

const renderWithContext = (Element: React.ReactElement) =>
  render(
    <IntlProvider locale={'en'}>
      <QueryClientProvider client={queryClient}>{Element}</QueryClientProvider>
    </IntlProvider>
  );

describe('Osquery Results', () => {
  beforeAll(() => {
    mockKibana();

    jest
      .spyOn(useLiveQueryDetails, 'useLiveQueryDetails')
      .mockImplementation(() => defaultLiveQueryDetails);
  });

  it('return results table', async () => {
    enablePrivileges();
    const { getByText, queryByText, getByTestId } = renderWithContext(
      <OsqueryActionResults {...defaultProps} />
    );
    expect(queryByText(PERMISSION_DENIED)).not.toBeInTheDocument();
    expect(getByTestId('osquery-results-comment'));
    expect(getByText('Test-rule')).toBeInTheDocument();
    expect(getByText('attached query')).toBeInTheDocument();
  });
});

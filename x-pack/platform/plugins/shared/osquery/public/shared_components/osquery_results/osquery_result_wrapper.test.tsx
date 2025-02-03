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

import { queryClient } from '../../query_client';
import { useKibana } from '../../common/lib/kibana';
import * as useLiveQueryDetails from '../../actions/use_live_query_details';
import { PERMISSION_DENIED } from '../osquery_action/translations';
import { OsqueryActionResult } from './osquery_result_wrapper';
import {
  defaultLiveQueryDetails,
  DETAILS_ID,
  DETAILS_QUERY,
  DETAILS_TIMESTAMP,
  getMockedKibanaConfig,
} from './test_utils';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const defaultPermissions = {
  osquery: {
    read: true,
    runSavedQueries: true,
    readSavedQueries: true,
  },
  discover_v2: {
    show: true,
  },
};

const defaultProps = {
  actionId: 'test-action-id',
  startDate: DETAILS_TIMESTAMP,
  queryId: '',
  ecsData: {
    _id: 'test',
    _index: 'test',
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
    const { getByText, queryByText, getByTestId } = renderWithContext(
      <OsqueryActionResult {...defaultProps} />
    );
    expect(queryByText(PERMISSION_DENIED)).not.toBeInTheDocument();
    expect(getByTestId('osquery-results-comment'));
    expect(getByText(DETAILS_QUERY)).toBeInTheDocument();
    expect(getByText(DETAILS_ID)).toBeInTheDocument();
  });
});

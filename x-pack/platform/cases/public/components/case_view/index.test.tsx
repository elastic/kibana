/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* x-pack/plugins/cases/public/components/case_view/index.test.tsx
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import '../../common/mock/match_media';
import type { CaseViewProps } from './types';
import { connectorsMock } from '../../containers/mock';
import type { SpacesApi } from '@kbn/spaces-plugin/public';
import { useUpdateCase } from '../../containers/use_update_case';
import type { UseGetCase } from '../../containers/use_get_case';
import { useGetCase } from '../../containers/use_get_case';
import { useGetCaseMetrics } from '../../containers/use_get_case_metrics';

import { usePostPushToService } from '../../containers/use_post_push_to_service';
import { useKibana } from '../../common/lib/kibana';
import { useFindCaseUserActions } from '../../containers/use_find_case_user_actions';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import type { AppMockRenderer } from '../../common/mock';
import { createAppMockRenderer } from '../../common/mock';
import CaseView from '.';
import { waitFor } from '@testing-library/react';
import { useGetTags } from '../../containers/use_get_tags';
import { casesQueriesKeys } from '../../containers/constants';
import {
  alertsHit,
  caseViewProps,
  defaultGetCase,
  defaultGetCaseMetrics,
  defaultUpdateCaseState,
  defaultUseFindCaseUserActions,
} from './mocks';
import userEvent from '@testing-library/user-event';

jest.mock('../../containers/use_get_action_license');
jest.mock('../../containers/use_update_case');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/use_find_case_user_actions');
jest.mock('../../containers/use_get_case');
jest.mock('../../containers/use_get_case_metrics');
jest.mock('../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../containers/use_post_push_to_service');
jest.mock('../user_actions/timestamp', () => ({
  UserActionTimestamp: () => <></>,
}));
jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');
jest.mock('../../containers/api');

const useFetchCaseMock = useGetCase as jest.Mock;
const useGetCaseMetricsMock = useGetCaseMetrics as jest.Mock;
const useUpdateCaseMock = useUpdateCase as jest.Mock;
const useFindCaseUserActionsMock = useFindCaseUserActions as jest.Mock;
const useGetConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const usePostPushToServiceMock = usePostPushToService as jest.Mock;
const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const useGetTagsMock = useGetTags as jest.Mock;

const spacesUiApiMock = {
  redirectLegacyUrl: jest.fn().mockResolvedValue(undefined),
  components: {
    getLegacyUrlConflict: jest.fn().mockReturnValue(<div data-test-subj="conflict-component" />),
  },
};

describe('CaseView', () => {
  const mockGetCase = (props: Partial<UseGetCase> = {}) => {
    const data = {
      ...defaultGetCase.data,
      ...props.data,
    };
    useFetchCaseMock.mockReturnValue({
      ...defaultGetCase,
      ...props,
      data,
    });
  };

  let appMockRenderer: AppMockRenderer;

  beforeAll(() => {
    mockGetCase();
    useGetCaseMetricsMock.mockReturnValue(defaultGetCaseMetrics);
    useUpdateCaseMock.mockReturnValue(defaultUpdateCaseState);
    useFindCaseUserActionsMock.mockReturnValue(defaultUseFindCaseUserActions);
    usePostPushToServiceMock.mockReturnValue({
      isLoading: false,
      mutateAsync: jest.fn(),
    });
    useGetConnectorsMock.mockReturnValue({ data: connectorsMock, isLoading: false });
    useGetTagsMock.mockReturnValue({ data: [], isLoading: false });
    useKibanaMock().services.spaces = { ui: spacesUiApiMock } as unknown as SpacesApi;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('should show an error if a case return error', async () => {
    mockGetCase({ isError: true });
    const result = appMockRenderer.render(<CaseView {...caseViewProps} />);

    expect(result.queryByTestId('case-view-does-not-exist')).toBeInTheDocument();
  });

  it('should return spinner if loading', async () => {
    mockGetCase({ isLoading: true });
    const result = appMockRenderer.render(<CaseView {...caseViewProps} />);
    expect(result.queryByTestId('case-view-loading')).toBeInTheDocument();
  });

  it('should return case view when data is there', async () => {
    mockGetCase({ data: { ...defaultGetCase.data, outcome: 'exactMatch' } });
    const result = appMockRenderer.render(<CaseView {...caseViewProps} />);

    expect(result.queryByTestId('case-view-title')).toBeInTheDocument();
    expect(spacesUiApiMock.components.getLegacyUrlConflict).not.toHaveBeenCalled();
    expect(spacesUiApiMock.redirectLegacyUrl).not.toHaveBeenCalled();
  });

  it('should redirect case view when resolves to alias match', async () => {
    const resolveAliasId = `${defaultGetCase.data.case.id}_2`;
    const resolveAliasPurpose = 'savedObjectConversion' as const;
    mockGetCase({
      data: {
        ...defaultGetCase.data,
        outcome: 'aliasMatch',
        aliasTargetId: resolveAliasId,
        aliasPurpose: resolveAliasPurpose,
      },
    });
    const result = appMockRenderer.render(<CaseView {...caseViewProps} />);
    expect(result.queryByTestId('case-view-title')).toBeInTheDocument();
    expect(spacesUiApiMock.components.getLegacyUrlConflict).not.toHaveBeenCalled();
    expect(spacesUiApiMock.redirectLegacyUrl).toHaveBeenCalledWith({
      path: `/cases/${resolveAliasId}`,
      aliasPurpose: resolveAliasPurpose,
      objectNoun: 'case',
    });
  });

  it('should redirect case view when resolves to conflict', async () => {
    const resolveAliasId = `${defaultGetCase.data.case.id}_2`;
    mockGetCase({
      data: { ...defaultGetCase.data, outcome: 'conflict', aliasTargetId: resolveAliasId },
    });

    const result = appMockRenderer.render(<CaseView {...caseViewProps} />);

    expect(result.queryByTestId('case-view-title')).toBeInTheDocument();
    expect(result.queryByTestId('conflict-component')).toBeInTheDocument();

    expect(spacesUiApiMock.redirectLegacyUrl).not.toHaveBeenCalled();
    expect(spacesUiApiMock.components.getLegacyUrlConflict).toHaveBeenCalledWith({
      objectNoun: 'case',
      currentObjectId: defaultGetCase.data.case.id,
      otherObjectId: resolveAliasId,
      otherObjectPath: `/cases/${resolveAliasId}`,
    });
  });

  it('should refresh data on refresh', async () => {
    const queryClientSpy = jest.spyOn(appMockRenderer.queryClient, 'invalidateQueries');
    const result = appMockRenderer.render(<CaseView {...caseViewProps} />);
    userEvent.click(result.getByTestId('case-refresh'));
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.caseView());
    expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
  });

  describe('when a `refreshRef` prop is provided', () => {
    let refreshRef: CaseViewProps['refreshRef'];
    let queryClientSpy: jest.SpyInstance;

    beforeEach(async () => {
      queryClientSpy = jest.spyOn(appMockRenderer.queryClient, 'invalidateQueries');
      refreshRef = React.createRef();
      appMockRenderer.render(
        <CaseView
          {...{
            refreshRef,
            caseId: '1234',
            onComponentInitialized: jest.fn(),
            showAlertDetails: jest.fn(),
            useFetchAlertData: jest.fn().mockReturnValue([false, alertsHit[0]]),
          }}
        />
      );
    });

    it('should set it with expected refresh interface', async () => {
      expect(refreshRef!.current).toEqual({
        refreshCase: expect.any(Function),
      });
    });

    it('should refresh actions and comments', async () => {
      refreshRef!.current!.refreshCase();
      await waitFor(() => {
        expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.caseView());
        expect(queryClientSpy).toHaveBeenCalledWith(casesQueriesKeys.tags());
      });
    });
  });
});

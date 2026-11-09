/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { OSQUERY_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';

import { PackResultsHeader } from './pack_results_header';
import { useIsExperimentalFeatureEnabled } from '../../common/experimental_features_context';
import { TestProvidersWithServices } from '../../__test_helpers__/create_mock_kibana_services';

jest.mock('../../common/experimental_features_context', () => ({
  ...jest.requireActual('../../common/experimental_features_context'),
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

const mockOpenCaseModal = jest.fn();
const MockCasesContext: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => (
  <>{children}</>
);

const mockUseKibana = jest.fn();
jest.mock('../../common/lib/kibana', () => ({
  ...jest.requireActual('../../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
}));

const mockUseIsExperimentalFeatureEnabled = useIsExperimentalFeatureEnabled as jest.MockedFunction<
  typeof useIsExperimentalFeatureEnabled
>;

describe('PackResultsHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        appName: 'osquery',
        application: { capabilities: { osquery: { writeLiveQueries: true } } },
        notifications: { toasts: { addError: jest.fn(), remove: jest.fn() } },
        cases: {
          helpers: {
            canUseCases: jest.fn().mockReturnValue({ read: true, update: true, push: true }),
            getRuleIdFromEvent: jest.fn(),
          },
          ui: { getCasesContext: jest.fn().mockReturnValue(MockCasesContext) },
          hooks: {
            useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({ open: mockOpenCaseModal }),
          },
        },
      },
    });
  });

  describe.each([
    ['query history header', true],
    ['legacy results header', false],
  ])('%s', (_, isQueryHistoryReworkEnabled) => {
    beforeEach(() => {
      mockUseIsExperimentalFeatureEnabled.mockImplementation(
        (feature) => feature === 'queryHistoryRework' && isQueryHistoryReworkEnabled
      );
    });

    it('attaches a scheduled execution to a case with its scheduleId and executionCount', () => {
      render(
        <TestProvidersWithServices>
          <PackResultsHeader
            actionId="schedule-1"
            queryIds={['schedule-1']}
            isScheduled
            scheduleId="schedule-1"
            executionCount={15}
          />
        </TestProvidersWithServices>
      );

      fireEvent.click(screen.getByRole('button', { name: 'Add to Case' }));

      const [{ getAttachments }] = mockOpenCaseModal.mock.calls[0];

      // Without scheduleId/executionCount the case renders the attachment as a live query and
      // looks up `schedule-1` as a live action id, which 404s and shows no results.
      expect(getAttachments({ theCase: { owner: 'securitySolution' } })).toEqual([
        {
          type: OSQUERY_ATTACHMENT_TYPE,
          attachmentId: 'schedule-1',
          metadata: {
            actionId: 'schedule-1',
            agentIds: [],
            queryId: '',
            scheduleId: 'schedule-1',
            executionCount: 15,
          },
        },
      ]);
    });
  });
});

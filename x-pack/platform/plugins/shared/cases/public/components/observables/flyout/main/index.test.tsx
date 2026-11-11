/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { FlyoutTemplateManagedProvider } from '@kbn/flyout-template';
import { readCasesPermissions, renderWithTestingProviders } from '../../../../common/mock';
import { mockCase, mockObservables } from '../../../../containers/mock';
import { useFindCasesByObservable } from '../../../../containers/use_find_cases_by_observable';
import { useFindObservables } from '../../../../containers/use_find_observables';
import { useGetCaseConfiguration } from '../../../../containers/configure/use_get_case_configuration';
import { useCaseConfigureResponse } from '../../../configure_cases/__mock__';
import { useCanRunCaseWorkflow } from '../../../workflows/use_run_case_workflow';
import { useObservableFlyoutApi } from '../use_observable_flyout_api';
import { createObservableFlyoutApiMock } from '../use_observable_flyout_api.mock';
import { ObservableFlyout } from '.';

jest.mock('../../../../containers/use_find_cases_by_observable');
jest.mock('../../../../containers/use_find_observables');
jest.mock('../../../../containers/configure/use_get_case_configuration');
jest.mock('../use_observable_flyout_api');
jest.mock('../../../workflows/use_run_case_workflow', () => ({
  ...jest.requireActual('../../../workflows/use_run_case_workflow'),
  useCanRunCaseWorkflow: jest.fn(),
}));
jest.mock('../../../workflows/use_cases_workflow_executor', () => ({
  useCasesWorkflowExecutor: jest.fn().mockReturnValue(jest.fn()),
}));
// Stub the workflow panel so the run workflow modal needs no Kibana HTTP context.
jest.mock('@kbn/workflows-ui', () => ({
  RunWorkflowPanel: () => <div data-test-subj="run-workflow-panel-mock" />,
}));

const useFindCasesByObservableMock = jest.mocked(useFindCasesByObservable);
const useFindObservablesMock = jest.mocked(useFindObservables);

const flyoutApi = createObservableFlyoutApiMock();

const params = {
  observable: {
    ...mockObservables[0],
    description: 'seen on the edge',
    metadata: { triage: 'confirmed' },
  },
  caseData: { ...mockCase, id: 'case-1', owner: 'securitySolution' },
  typeLabel: 'IPv4',
};

const mockStored = (observables: Array<typeof params.observable>) =>
  useFindObservablesMock.mockReturnValue({
    data: { observables, total: observables.length },
  } as unknown as ReturnType<typeof useFindObservables>);

const mockCount = ({
  total = 0,
  isLoading = false,
  isError = false,
}: {
  total?: number;
  isLoading?: boolean;
  isError?: boolean;
}) =>
  useFindCasesByObservableMock.mockReturnValue({
    data: isLoading || isError ? undefined : { cases: [], page: 1, perPage: 0, total },
    isLoading,
    isError,
  } as unknown as ReturnType<typeof useFindCasesByObservable>);

const renderPanel = () =>
  renderWithTestingProviders(
    <FlyoutTemplateManagedProvider
      value={{
        props: { session: 'never', 'data-test-subj': 'cases-observable-flyout' },
        close: jest.fn(),
      }}
    >
      <ObservableFlyout {...params} onClose={jest.fn()} />
    </FlyoutTemplateManagedProvider>
  );

describe('ObservableFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useObservableFlyoutApi).mockReturnValue(flyoutApi);
    (useGetCaseConfiguration as jest.Mock).mockReturnValue(useCaseConfigureResponse);
    jest.mocked(useCanRunCaseWorkflow).mockReturnValue(true);
    mockStored([]);
    mockCount({ total: 3 });
  });

  it('shows the value and its type in the header', () => {
    renderPanel();

    const header = screen.getByTestId('cases-observable-flyoutHeader');
    expect(within(header).getByText('127.0.0.1')).toBeInTheDocument();
    expect(within(header).getByTestId('cases-observable-flyout-type')).toHaveTextContent('IPv4');
  });

  it('shows the dates, then the description, under "In this case"', () => {
    renderPanel();

    const section = screen.getByTestId('cases-observable-flyout-case-fields');
    expect(within(section).getByText('In this case')).toBeInTheDocument();
    expect(within(section).getByTestId('cases-observable-flyout-description')).toHaveTextContent(
      'seen on the edge'
    );
    expect(within(section).getByTestId('cases-observable-flyout-date-added')).toHaveTextContent(
      'Date added'
    );
    expect(within(section).getByTestId('cases-observable-flyout-last-updated')).toHaveTextContent(
      'Last updated'
    );
    const dates = within(section).getByTestId('cases-observable-flyout-case-blocks');
    const descriptionText = within(section).getByTestId('cases-observable-flyout-description');
    expect(dates.compareDocumentPosition(descriptionText)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('leaves the description out when there is none', () => {
    renderWithTestingProviders(
      <FlyoutTemplateManagedProvider value={{ props: { session: 'never' }, close: jest.fn() }}>
        <ObservableFlyout
          {...params}
          observable={{ ...params.observable, description: null }}
          onClose={jest.fn()}
        />
      </FlyoutTemplateManagedProvider>
    );

    expect(screen.queryByTestId('cases-observable-flyout-description')).not.toBeInTheDocument();
    expect(screen.getByTestId('cases-observable-flyout-date-added')).toBeInTheDocument();
  });

  it('lists the metadata pairs under "Shared across cases"', () => {
    renderWithTestingProviders(
      <FlyoutTemplateManagedProvider value={{ props: { session: 'never' }, close: jest.fn() }}>
        <ObservableFlyout
          {...params}
          observable={{ ...params.observable, metadata: { triage: 'confirmed', owner: 'soc-1' } }}
          onClose={jest.fn()}
        />
      </FlyoutTemplateManagedProvider>
    );

    const section = screen.getByTestId('cases-observable-flyout-shared-fields');
    expect(within(section).getByText('Shared across cases')).toBeInTheDocument();
    const list = within(section).getByTestId('cases-observable-flyout-metadata');
    // Sorted by key.
    expect(list).toHaveTextContent('ownersoc-1triageconfirmed');
    expect(
      within(list).getByTestId('cases-observable-flyout-metadata-value-triage')
    ).toHaveTextContent('confirmed');
  });

  it('says when the value has no shared metadata', () => {
    renderWithTestingProviders(
      <FlyoutTemplateManagedProvider value={{ props: { session: 'never' }, close: jest.fn() }}>
        <ObservableFlyout
          {...params}
          observable={{ ...params.observable, metadata: undefined }}
          onClose={jest.fn()}
        />
      </FlyoutTemplateManagedProvider>
    );

    expect(screen.getByTestId('cases-observable-flyout-shared-fields')).toHaveTextContent(
      'No shared metadata.'
    );
  });

  it('counts the other cases of the owner holding the exact value', () => {
    renderPanel();

    expect(useFindCasesByObservableMock).toHaveBeenCalledWith({
      owner: 'securitySolution',
      typeKey: params.observable.typeKey,
      value: '127.0.0.1',
      excludeCaseId: 'case-1',
      perPage: 0,
    });
    const insights = screen.getByTestId('cases-observable-flyout-insights');
    expect(
      within(insights).getByTestId('cases-observable-flyout-casesTitleLink')
    ).toHaveTextContent('Cases');
    expect(screen.getByTestId('cases-observable-flyout-related-casesText')).toHaveTextContent(
      'Related cases'
    );
    expect(screen.getByTestId('cases-observable-flyout-related-casesButton')).toHaveTextContent(
      '3'
    );
  });

  it('opens the cases tool from the count', async () => {
    renderPanel();

    await userEvent.click(screen.getByTestId('cases-observable-flyout-related-casesButton'));

    expect(flyoutApi.openObservableCases).toHaveBeenCalledWith({
      observable: params.observable,
      caseData: params.caseData,
      typeLabel: 'IPv4',
    });
  });

  it('opens the cases tool from the panel title', async () => {
    renderPanel();

    await userEvent.click(screen.getByTestId('cases-observable-flyout-casesTitleLink'));

    expect(flyoutApi.openObservableCases).toHaveBeenCalledTimes(1);
  });

  it('shows a count of 0 that opens nothing', () => {
    mockCount({ total: 0 });
    renderPanel();

    expect(screen.getByTestId('cases-observable-flyout-related-casesButton')).toBeDisabled();
  });

  it('shows a skeleton while counting', () => {
    mockCount({ isLoading: true });
    renderPanel();

    expect(screen.getByTestId('cases-observable-flyout-related-casesLoading')).toBeInTheDocument();
  });

  it('leaves the row out when the count failed', () => {
    mockCount({ isError: true });
    renderPanel();

    expect(screen.getByTestId('cases-observable-flyout-casesPanel')).toBeInTheDocument();
    expect(screen.queryByTestId('cases-observable-flyout-related-cases')).not.toBeInTheDocument();
  });

  describe('current observable', () => {
    it('reads the observable back by type and value', () => {
      renderPanel();

      expect(useFindObservablesMock).toHaveBeenCalledWith('case-1', {
        typeKeys: [params.observable.typeKey],
        search: '127.0.0.1',
        sortField: 'value',
        sortOrder: 'asc',
        perPage: 10,
      });
    });

    it('shows the stored observable, so a change made elsewhere shows', () => {
      mockStored([{ ...params.observable, metadata: { triage: 'false positive' } }]);
      renderPanel();

      expect(screen.getByTestId('cases-observable-flyout-metadata-value-triage')).toHaveTextContent(
        'false positive'
      );
    });
  });

  describe('take action', () => {
    it('offers running a workflow and editing the observable', async () => {
      renderPanel();

      await userEvent.click(screen.getByTestId('cases-observable-flyout-take-action'));
      await waitForEuiPopoverOpen();

      expect(await screen.findByTestId('cases-observable-flyout-run-workflow')).toHaveTextContent(
        'Run workflow'
      );
      expect(screen.getByTestId('cases-observable-flyout-edit')).toHaveTextContent(
        'Edit observable'
      );
    });

    it('opens the edit modal on the observable', async () => {
      renderPanel();

      await userEvent.click(screen.getByTestId('cases-observable-flyout-take-action'));
      await waitForEuiPopoverOpen();
      await userEvent.click(await screen.findByTestId('cases-observable-flyout-edit'));

      expect(await screen.findByTestId('case-observables-edit-modal')).toBeInTheDocument();
    });

    it('opens the run workflow modal', async () => {
      renderPanel();

      await userEvent.click(screen.getByTestId('cases-observable-flyout-take-action'));
      await waitForEuiPopoverOpen();
      await userEvent.click(await screen.findByTestId('cases-observable-flyout-run-workflow'));

      expect(await screen.findByTestId('run-workflow-panel-mock')).toBeInTheDocument();
    });

    it('offers only the actions the user may take', async () => {
      jest.mocked(useCanRunCaseWorkflow).mockReturnValue(false);
      renderPanel();

      await userEvent.click(screen.getByTestId('cases-observable-flyout-take-action'));
      await waitForEuiPopoverOpen();

      expect(await screen.findByTestId('cases-observable-flyout-edit')).toBeInTheDocument();
      expect(screen.queryByTestId('cases-observable-flyout-run-workflow')).not.toBeInTheDocument();
    });

    it('has no footer for a user who may take no action', () => {
      jest.mocked(useCanRunCaseWorkflow).mockReturnValue(false);
      renderWithTestingProviders(
        <FlyoutTemplateManagedProvider value={{ props: { session: 'never' }, close: jest.fn() }}>
          <ObservableFlyout {...params} onClose={jest.fn()} />
        </FlyoutTemplateManagedProvider>,
        { wrapperProps: { permissions: readCasesPermissions() } }
      );

      expect(screen.queryByTestId('cases-observable-flyout-take-action')).not.toBeInTheDocument();
    });
  });
});

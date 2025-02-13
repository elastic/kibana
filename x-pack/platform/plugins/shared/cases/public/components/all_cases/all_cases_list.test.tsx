/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment-timezone';
import { render, waitFor, screen, within, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

import type { AppMockRenderer } from '../../common/mock';
import {
  createAppMockRenderer,
  noDeleteCasesPermissions,
  readCasesPermissions,
  TestProviders,
} from '../../common/mock';
import { useGetCasesMockState, connectorsMock } from '../../containers/mock';

import { SortFieldCase } from '../../../common/ui/types';
import { CaseSeverity, CaseStatuses } from '../../../common/types/domain';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { getEmptyCellValue } from '../empty_value';
import { useKibana } from '../../common/lib/kibana';
import { AllCasesList } from './all_cases_list';
import { useCasesColumns } from './use_cases_columns';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { registerConnectorsToMockActionRegistry } from '../../common/mock/register_connectors';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import { waitForComponentToUpdate } from '../../common/test_utils';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { useGetTags } from '../../containers/use_get_tags';
import { useGetCategories } from '../../containers/use_get_categories';
import { useUpdateCase } from '../../containers/use_update_case';
import { useGetCases } from '../../containers/use_get_cases';
import {
  DEFAULT_QUERY_PARAMS,
  DEFAULT_FILTER_OPTIONS,
  DEFAULT_CASES_TABLE_STATE,
} from '../../containers/constants';
import { useGetCurrentUserProfile } from '../../containers/user_profiles/use_get_current_user_profile';
import { userProfiles, userProfilesMap } from '../../containers/user_profiles/api.mock';
import { useBulkGetUserProfiles } from '../../containers/user_profiles/use_bulk_get_user_profiles';
import { useLicense } from '../../common/use_license';
import * as api from '../../containers/api';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useCaseConfigureResponse } from '../configure_cases/__mock__';
import { useSuggestUserProfiles } from '../../containers/user_profiles/use_suggest_user_profiles';

jest.mock('../../containers/configure/use_get_case_configuration');
jest.mock('../../containers/use_get_cases');
jest.mock('../../containers/use_get_action_license');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/use_get_categories');
jest.mock('../../containers/user_profiles/use_get_current_user_profile');
jest.mock('../../containers/user_profiles/use_bulk_get_user_profiles');
jest.mock('../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../common/lib/kibana');
jest.mock('../../common/navigation/hooks');
jest.mock('../app/use_available_owners', () => ({
  useAvailableCasesOwners: () => ['securitySolution', 'observability'],
}));
jest.mock('../../containers/use_update_case');
jest.mock('../../common/use_license');
jest.mock('../../containers/user_profiles/use_suggest_user_profiles');

const useGetCaseConfigurationMock = useGetCaseConfiguration as jest.Mock;
const useGetCasesMock = useGetCases as jest.Mock;
const useGetTagsMock = useGetTags as jest.Mock;
const useGetCurrentUserProfileMock = useGetCurrentUserProfile as jest.Mock;
const useBulkGetUserProfilesMock = useBulkGetUserProfiles as jest.Mock;
const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const useGetConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const useUpdateCaseMock = useUpdateCase as jest.Mock;
const useLicenseMock = useLicense as jest.Mock;
const useGetCategoriesMock = useGetCategories as jest.Mock;
const useSuggestUserProfilesMock = useSuggestUserProfiles as jest.Mock;

const mockTriggersActionsUiService = triggersActionsUiMock.createStart();

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...createStartServicesMock(),
      triggersActionsUi: mockTriggersActionsUiService,
    },
  } as unknown as ReturnType<typeof useKibana>);
};

// eslint-disable-next-line prefer-object-spread
const originalGetComputedStyle = Object.assign({}, window.getComputedStyle);

const restoreGetComputedStyle = () => {
  Object.defineProperty(window, 'getComputedStyle', originalGetComputedStyle);
};

const patchGetComputedStyle = () => {
  // The JSDOM implementation is too slow
  // Especially for dropdowns that try to position themselves
  // perf issue - https://github.com/jsdom/jsdom/issues/3234
  Object.defineProperty(window, 'getComputedStyle', {
    value: (el: HTMLElement) => {
      /**
       * This is based on the jsdom implementation of getComputedStyle
       * https://github.com/jsdom/jsdom/blob/9dae17bf0ad09042cfccd82e6a9d06d3a615d9f4/lib/jsdom/browser/Window.js#L779-L820
       *
       * It is missing global style parsing and will only return styles applied directly to an element.
       * Will not return styles that are global or from emotion
       */
      const declaration = new CSSStyleDeclaration();
      const { style } = el;

      Array.prototype.forEach.call(style, (property: string) => {
        declaration.setProperty(
          property,
          style.getPropertyValue(property),
          style.getPropertyPriority(property)
        );
      });

      return declaration;
    },
    configurable: true,
    writable: true,
  });
};

// FLAKY: https://github.com/elastic/kibana/issues/192739
describe.skip('AllCasesListGeneric', () => {
  const onRowClick = jest.fn();
  const updateCaseProperty = jest.fn();

  const emptyTag = getEmptyCellValue().props.children;

  const defaultGetCases = {
    ...useGetCasesMockState,
  };

  const defaultColumnArgs = {
    filterStatus: [CaseStatuses.open],
    handleIsLoading: jest.fn(),
    isLoadingCases: [],
    isLoadingColumns: false,
    isSelectorView: false,
    userProfiles: new Map(),
    currentUserProfile: undefined,
    selectedColumns: [],
  };

  const removeMsFromDate = (value: string) => moment(value).format('YYYY-MM-DDTHH:mm:ss[Z]');

  let appMockRenderer: AppMockRenderer;

  beforeAll(() => {
    patchGetComputedStyle();
    mockKibana();
    const actionTypeRegistry = useKibanaMock().services.triggersActionsUi.actionTypeRegistry;
    registerConnectorsToMockActionRegistry(actionTypeRegistry, connectorsMock);
  });

  afterAll(() => {
    restoreGetComputedStyle();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
    useGetCasesMock.mockReturnValue(defaultGetCases);
    useGetTagsMock.mockReturnValue({ data: ['coke', 'pepsi'], isLoading: false });
    useGetCategoriesMock.mockReturnValue({ data: ['twix', 'snickers'], isLoading: false });
    useGetCurrentUserProfileMock.mockReturnValue({ data: userProfiles[0], isLoading: false });
    useGetConnectorsMock.mockImplementation(() => ({ data: connectorsMock, isLoading: false }));
    useGetCaseConfigurationMock.mockImplementation(() => useCaseConfigureResponse);
    useBulkGetUserProfilesMock.mockReturnValue({ data: userProfilesMap });
    useUpdateCaseMock.mockReturnValue({ mutate: updateCaseProperty });
    useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => false });
    useSuggestUserProfilesMock.mockReturnValue({ data: userProfiles, isLoading: false });
    mockKibana();
    moment.tz.setDefault('UTC');
    window.localStorage.clear();
  });

  afterEach(() => {
    moment.tz.setDefault('Browser');
  });

  it('should render AllCasesList', async () => {
    useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => true });
    appMockRenderer.render(<AllCasesList />);

    const caseDetailsLinks = await screen.findAllByTestId('case-details-link');

    expect(caseDetailsLinks[0]).toHaveAttribute('href', '/app/security/cases/test');
    expect(caseDetailsLinks[0]).toHaveTextContent(useGetCasesMockState.data.cases[0].title);
    expect(
      (await screen.findAllByTestId('case-user-profile-avatar-damaged_raccoon'))[0]
    ).toHaveTextContent('DR');
    expect((await screen.findAllByTestId('case-table-column-tags-coke'))[0]).toHaveAttribute(
      'title',
      useGetCasesMockState.data.cases[0].tags[0]
    );
    expect(
      (await screen.findAllByTestId('case-table-column-createdAt'))[0].querySelector(
        '.euiToolTipAnchor'
      )
    ).toHaveTextContent(removeMsFromDate(useGetCasesMockState.data.cases[0].createdAt));
    expect(await screen.findByTestId('case-table-case-count')).toHaveTextContent(
      `Showing 10 of ${useGetCasesMockState.data.total} cases`
    );

    expect(screen.queryByTestId('all-cases-maximum-limit-warning')).not.toBeInTheDocument();
    expect(screen.queryByTestId('all-cases-clear-filters-link-icon')).not.toBeInTheDocument();
  });

  it("should show a tooltip with the assignee's email when hover over the assignee avatar", async () => {
    useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => true });

    appMockRenderer.render(<AllCasesList />);

    await userEvent.hover(
      (
        await screen.findAllByTestId('case-user-profile-avatar-damaged_raccoon')
      )[0]
    );

    expect(await screen.findByText('damaged_raccoon@elastic.co')).toBeInTheDocument();
  });

  it('should show a tooltip with all tags when hovered', async () => {
    appMockRenderer.render(<AllCasesList />);

    await userEvent.hover((await screen.findAllByTestId('case-table-column-tags'))[0]);

    expect(await screen.findByTestId('case-table-column-tags-tooltip')).toBeTruthy();
  });

  it('should render empty fields', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      data: {
        ...defaultGetCases.data,
        cases: [
          {
            ...defaultGetCases.data.cases[0],
            id: null,
            createdAt: null,
            createdBy: null,
            updatedAt: null,
            status: null,
            severity: null,
            tags: null,
            title: null,
            totalComment: null,
            totalAlerts: null,
            assignees: [],
          },
        ],
      },
    });

    appMockRenderer.render(<AllCasesList />);

    const checkIt = async (columnName: string, key: number) => {
      const column = (await screen.findByTestId('cases-table')).querySelectorAll(
        'tbody .euiTableRowCell'
      );
      expect(column[key].querySelector('.euiTableRowCell--hideForDesktop')).toHaveTextContent(
        columnName
      );
      expect(column[key].querySelector('span')).toHaveTextContent(emptyTag);
    };

    const { result } = renderHook(() => useCasesColumns(defaultColumnArgs), {
      wrapper: ({ children }) => <TestProviders>{children}</TestProviders>,
    });

    await waitFor(() => {
      result.current.columns.map(
        (i, key) => i.name != null && i.name !== 'Actions' && checkIt(`${i.name}`, key)
      );
    });
  });

  it('should not call onCreateCasePressed if onRowClick is not provided when create case from case page', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      data: {
        ...defaultGetCases.data,
        cases: [],
      },
    });
    appMockRenderer.render(<AllCasesList isSelectorView={false} />);
    await userEvent.click(await screen.findByTestId('cases-table-add-case'));
    await waitFor(() => {
      expect(onRowClick).not.toHaveBeenCalled();
    });
  });

  it('should tableHeaderSortButton AllCasesList', async () => {
    appMockRenderer.render(<AllCasesList />);

    await userEvent.click((await screen.findAllByTestId('tableHeaderSortButton'))[0]);

    await waitFor(() => {
      expect(useGetCasesMock).toBeCalledWith(
        expect.objectContaining({
          queryParams: {
            ...DEFAULT_QUERY_PARAMS,
          },
        })
      );
    });
  });

  it('renders the columns correctly', async () => {
    appMockRenderer.render(<AllCasesList isSelectorView={false} />);

    const casesTable = within(await screen.findByTestId('cases-table'));

    expect(await casesTable.findByTitle('Name')).toBeInTheDocument();
    expect(await casesTable.findByTitle('Category')).toBeInTheDocument();
    expect(await casesTable.findByTitle('Created on')).toBeInTheDocument();
    expect(await casesTable.findByTitle('Updated on')).toBeInTheDocument();
    expect(await casesTable.findByTitle('Status')).toBeInTheDocument();
    expect(await casesTable.findByTitle('Severity')).toBeInTheDocument();
    expect(await casesTable.findByTitle('Tags')).toBeInTheDocument();
    expect(await casesTable.findByTitle('Alerts')).toBeInTheDocument();
    expect(await casesTable.findByTitle('Comments')).toBeInTheDocument();
    expect(await casesTable.findByTitle('External incident')).toBeInTheDocument();
    expect(await casesTable.findByTitle('Actions')).toBeInTheDocument();
  });

  it('should not render table utility bar when isSelectorView=true', async () => {
    appMockRenderer.render(<AllCasesList isSelectorView={true} />);

    expect(screen.queryByTestId('case-table-selected-case-count')).not.toBeInTheDocument();
    expect(screen.queryByTestId('case-table-bulk-actions')).not.toBeInTheDocument();
  });

  it('should not render table utility bar when the user does not have permissions to delete', async () => {
    render(
      <TestProviders permissions={noDeleteCasesPermissions()}>
        <AllCasesList isSelectorView={true} />
      </TestProviders>
    );

    expect(screen.queryByTestId('case-table-selected-case-count')).not.toBeInTheDocument();
    expect(screen.queryByTestId('case-table-bulk-actions')).not.toBeInTheDocument();
  });

  it('should render metrics when isSelectorView=false', async () => {
    appMockRenderer.render(<AllCasesList isSelectorView={false} />);

    expect(await screen.findByTestId('cases-metrics-stats')).toBeInTheDocument();
  });

  it('should not render metrics when isSelectorView=true', async () => {
    appMockRenderer.render(<AllCasesList isSelectorView={true} />);

    expect(screen.queryByTestId('case-table-selected-case-count')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cases-metrics-stats')).not.toBeInTheDocument();
  });

  it('should call onRowClick with no cases and isSelectorView=true when create case is clicked', async () => {
    appMockRenderer.render(<AllCasesList isSelectorView={true} onRowClick={onRowClick} />);
    await userEvent.click(await screen.findByTestId('cases-table-add-case-filter-bar'));
    const isCreateCase = true;

    await waitFor(() => {
      expect(onRowClick).toHaveBeenCalled();
      expect(onRowClick).toBeCalledWith(undefined, isCreateCase);
    });
  });

  it('should call onRowClick when clicking a case with modal=true', async () => {
    const theCase = defaultGetCases.data.cases[0];

    appMockRenderer.render(<AllCasesList isSelectorView={true} onRowClick={onRowClick} />);

    await userEvent.click(await screen.findByTestId(`cases-table-row-select-${theCase.id}`));

    await waitFor(() => {
      expect(onRowClick).toHaveBeenCalledWith(theCase);
    });
  });

  it('should NOT call onRowClick when clicking a case with modal=true', async () => {
    appMockRenderer.render(<AllCasesList isSelectorView={false} />);

    await userEvent.click(await screen.findByTestId('cases-table-row-1'));

    await waitFor(() => {
      expect(onRowClick).not.toHaveBeenCalled();
    });
  });

  it('should sort by status', async () => {
    appMockRenderer.render(<AllCasesList isSelectorView={false} />);

    // 0 is the status filter button label
    await userEvent.click((await screen.findAllByTitle('Status'))[1]);

    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryParams: {
            ...DEFAULT_QUERY_PARAMS,
            sortField: SortFieldCase.status,
            sortOrder: 'asc',
          },
        })
      );
    });
  });

  it('should render Name, Category, CreatedOn and Severity columns when isSelectorView=true', async () => {
    appMockRenderer.render(<AllCasesList isSelectorView={true} />);

    expect(await screen.findByTitle('Name')).toBeInTheDocument();
    expect(await screen.findByTitle('Category')).toBeInTheDocument();
    expect(await screen.findByTitle('Created on')).toBeInTheDocument();
    // 0 is the severity filter button label
    expect((await screen.findAllByTitle('Severity'))[1]).toBeInTheDocument();
  });

  it('should sort by severity', async () => {
    appMockRenderer.render(<AllCasesList isSelectorView={false} />);

    // 0 is the severity filter button label
    await userEvent.click((await screen.findAllByTitle('Severity'))[1]);

    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryParams: {
            ...DEFAULT_QUERY_PARAMS,
            sortField: SortFieldCase.severity,
            sortOrder: 'asc',
          },
        })
      );
    });
  });

  it('should sort by title', async () => {
    appMockRenderer.render(<AllCasesList isSelectorView={false} />);

    await userEvent.click(await screen.findByTitle('Name'));

    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryParams: {
            ...DEFAULT_QUERY_PARAMS,
            sortField: SortFieldCase.title,
            sortOrder: 'asc',
          },
        })
      );
    });
  });

  it('should sort by updatedOn', async () => {
    appMockRenderer.render(<AllCasesList isSelectorView={false} />);

    await userEvent.click(await screen.findByTitle('Updated on'));

    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryParams: {
            ...DEFAULT_QUERY_PARAMS,
            sortField: SortFieldCase.updatedAt,
            sortOrder: 'asc',
          },
        })
      );
    });
  });

  it('should sort by category', async () => {
    appMockRenderer.render(<AllCasesList isSelectorView={false} />);

    await userEvent.click(await screen.findByTitle('Category'));

    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryParams: {
            ...DEFAULT_QUERY_PARAMS,
            sortField: SortFieldCase.category,
            sortOrder: 'asc',
          },
        })
      );
    });
  });

  it('should filter by category', async () => {
    appMockRenderer.render(<AllCasesList isSelectorView={false} />);

    await userEvent.click(await screen.findByTestId('options-filter-popover-button-category'));
    await waitForEuiPopoverOpen();
    await userEvent.click(await screen.findByTestId('options-filter-popover-item-twix'));

    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith({
        filterOptions: {
          ...DEFAULT_FILTER_OPTIONS,
          searchFields: ['title', 'description'],
          category: ['twix'],
        },
        queryParams: DEFAULT_QUERY_PARAMS,
      });
    });
  });

  it('should show the correct count on stats', async () => {
    appMockRenderer.render(<AllCasesList isSelectorView={false} />);

    await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));

    expect(await screen.findByTestId('options-filter-popover-item-open')).toHaveTextContent(
      'Open (20)'
    );
    expect(await screen.findByTestId('options-filter-popover-item-in-progress')).toHaveTextContent(
      'In progress (40)'
    );
    expect(await screen.findByTestId('options-filter-popover-item-closed')).toHaveTextContent(
      'Closed (130)'
    );
  });

  it('shows Solution column if there are no set owners', async () => {
    render(
      <TestProviders owner={[]}>
        <AllCasesList isSelectorView={false} />
      </TestProviders>
    );

    expect((await screen.findAllByText('Solution'))[0]).toBeInTheDocument();
  });

  it('hides Solution column if there is a set owner', async () => {
    appMockRenderer.render(<AllCasesList isSelectorView={false} />);

    expect(screen.queryByText('Solution')).not.toBeInTheDocument();
  });

  it('should deselect cases when refreshing', async () => {
    appMockRenderer.render(<AllCasesList />);

    const allCheckbox = await screen.findByTestId('checkboxSelectAll');
    await userEvent.click(allCheckbox);
    const checkboxes = await screen.findAllByRole('checkbox');

    for (const checkbox of checkboxes) {
      expect(checkbox).toBeChecked();
    }

    await userEvent.click(await screen.findByText('Refresh'));
    for (const checkbox of checkboxes) {
      expect(checkbox).not.toBeChecked();
    }

    await waitForComponentToUpdate();
  });

  it('should deselect cases when changing filters', async () => {
    useGetCasesMock.mockReturnValue({
      ...defaultGetCases,
      selectedCases: [],
    });

    appMockRenderer.render(<AllCasesList />);

    const allCheckbox = await screen.findByTestId('checkboxSelectAll');

    await userEvent.click(allCheckbox);
    const checkboxes = await screen.findAllByRole('checkbox');

    for (const checkbox of checkboxes) {
      expect(checkbox).toBeChecked();
    }

    await userEvent.click(await screen.findByTestId('options-filter-popover-button-status'));
    await waitForEuiPopoverOpen();
    await userEvent.click(await screen.findByTestId('options-filter-popover-item-open'));

    for (const checkbox of checkboxes) {
      expect(checkbox).not.toBeChecked();
    }

    await waitForComponentToUpdate();
  });

  it('should hide the alerts column if the alert feature is disabled', async () => {
    render(
      <TestProviders features={{ alerts: { enabled: false } }}>
        <AllCasesList />
      </TestProviders>
    );

    expect(await screen.findByTestId('cases-table')).toBeInTheDocument();
    expect(screen.queryAllByTestId('case-table-column-alertsCount').length).toBe(0);
  });

  it('should show the alerts column if the alert feature is enabled', async () => {
    const { findAllByTestId } = render(
      <TestProviders features={{ alerts: { enabled: true } }}>
        <AllCasesList />
      </TestProviders>
    );

    const alertCounts = await findAllByTestId('case-table-column-alertsCount');

    expect(alertCounts.length).toBeGreaterThan(0);
  });

  it('should show the alerts column if the alert object is empty', async () => {
    const { findAllByTestId } = render(
      <TestProviders features={{ alerts: {} }}>
        <AllCasesList />
      </TestProviders>
    );

    const alertCounts = await findAllByTestId('case-table-column-alertsCount');

    expect(alertCounts.length).toBeGreaterThan(0);
  });

  it('should clear the filters correctly', async () => {
    useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => true });

    appMockRenderer.render(<AllCasesList />);

    await userEvent.click(await screen.findByTestId('options-filter-popover-button-category'));
    await waitForEuiPopoverOpen();
    await userEvent.click(await screen.findByTestId('options-filter-popover-item-twix'));

    await userEvent.click(await screen.findByTestId('all-cases-clear-filters-link-icon'));

    await waitFor(() => {
      expect(useGetCasesMock).toHaveBeenLastCalledWith(DEFAULT_CASES_TABLE_STATE);
    });
  });

  describe('Solutions', () => {
    it('should hide the solutions filter if the owner is provided', async () => {
      render(
        <TestProviders owner={[SECURITY_SOLUTION_OWNER]}>
          <AllCasesList />
        </TestProviders>
      );

      expect(screen.queryByTestId('options-filter-popover-button-owner')).not.toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    const updateCasesSpy = jest.spyOn(api, 'updateCases');
    const deleteCasesSpy = jest.spyOn(api, 'deleteCases');

    describe('Bulk actions', () => {
      it('Renders bulk action', async () => {
        appMockRenderer.render(<AllCasesList />);

        expect(await screen.findByTestId('cases-table')).toBeInTheDocument();

        await userEvent.click(await screen.findByTestId('checkboxSelectAll'));
        await userEvent.click(await screen.findByText('Bulk actions'));

        expect(await screen.findByTestId('case-bulk-action-status')).toBeInTheDocument();
        expect(await screen.findByTestId('cases-bulk-action-delete')).toBeInTheDocument();
      });

      it.each([[CaseStatuses.open], [CaseStatuses['in-progress']], [CaseStatuses.closed]])(
        'Bulk update status: %s',
        async (status) => {
          appMockRenderer.render(<AllCasesList />);

          expect(await screen.findByTestId('cases-table')).toBeInTheDocument();

          await userEvent.click(await screen.findByTestId('checkboxSelectAll'));

          await userEvent.click(await screen.findByText('Bulk actions'));

          await userEvent.click(await screen.findByTestId('case-bulk-action-status'), {
            pointerEventsCheck: 0,
          });

          expect(
            await screen.findByTestId(`cases-bulk-action-status-${status}`)
          ).toBeInTheDocument();

          await userEvent.click(await screen.findByTestId(`cases-bulk-action-status-${status}`));

          await waitFor(() => {
            expect(updateCasesSpy).toBeCalledWith({
              cases: useGetCasesMockState.data.cases.map(({ id, version }) => ({
                id,
                version,
                status,
              })),
            });
          });
        }
      );

      it.each([
        [CaseSeverity.LOW],
        [CaseSeverity.MEDIUM],
        [CaseSeverity.HIGH],
        [CaseSeverity.CRITICAL],
      ])('Bulk update severity: %s', async (severity) => {
        appMockRenderer.render(<AllCasesList />);

        expect(await screen.findByTestId('cases-table')).toBeInTheDocument();

        await userEvent.click(await screen.findByTestId('checkboxSelectAll'));

        await userEvent.click(await screen.findByText('Bulk actions'));

        await userEvent.click(await screen.findByTestId('case-bulk-action-severity'), {
          pointerEventsCheck: 0,
        });

        expect(
          await screen.findByTestId(`cases-bulk-action-severity-${severity}`)
        ).toBeInTheDocument();

        await userEvent.click(await screen.findByTestId(`cases-bulk-action-severity-${severity}`));

        await waitFor(() => {
          expect(updateCasesSpy).toBeCalledWith({
            cases: useGetCasesMockState.data.cases.map(({ id, version }) => ({
              id,
              version,
              severity,
            })),
          });
        });
      });

      it('Bulk delete', async () => {
        appMockRenderer.render(<AllCasesList />);

        expect(await screen.findByTestId('cases-table')).toBeInTheDocument();

        await userEvent.click(await screen.findByTestId('checkboxSelectAll'));

        await userEvent.click(await screen.findByText('Bulk actions'));

        await userEvent.click(await screen.findByTestId('cases-bulk-action-delete'), {
          pointerEventsCheck: 0,
        });

        expect(await screen.findByTestId('confirm-delete-case-modal')).toBeInTheDocument();

        await userEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

        await waitFor(() => {
          expect(deleteCasesSpy).toHaveBeenCalledWith({
            caseIds: [
              'basic-case-id',
              '1',
              '2',
              '3',
              '4',
              'case-with-alerts-id',
              'case-with-alerts-syncoff-id',
              'case-with-registered-attachment',
            ],
          });
        });
      });

      it('should disable the checkboxes when the user has read only permissions', async () => {
        appMockRenderer = createAppMockRenderer({ permissions: readCasesPermissions() });
        appMockRenderer.render(<AllCasesList />);

        expect(await screen.findByTestId('checkboxSelectAll')).toBeDisabled();

        for (const theCase of defaultGetCases.data.cases) {
          expect(await screen.findByTestId(`checkboxSelectRow-${theCase.id}`)).toBeDisabled();
        }
      });
    });

    describe('Row actions', () => {
      const statusTests = [
        [CaseStatuses.open],
        [CaseStatuses['in-progress']],
        [CaseStatuses.closed],
      ];

      const severityTests = [
        [CaseSeverity.LOW],
        [CaseSeverity.MEDIUM],
        [CaseSeverity.HIGH],
        [CaseSeverity.CRITICAL],
      ];

      it('should render row actions', async () => {
        appMockRenderer.render(<AllCasesList />);

        for (const theCase of defaultGetCases.data.cases) {
          expect(
            await screen.findByTestId(`case-action-popover-button-${theCase.id}`)
          ).toBeInTheDocument();
        }
      });

      it.each(statusTests)('update the status of a case: %s', async (status) => {
        appMockRenderer.render(<AllCasesList />);
        const openCase = useGetCasesMockState.data.cases[0];
        const inProgressCase = useGetCasesMockState.data.cases[1];
        const theCase = status === CaseStatuses.open ? inProgressCase : openCase;

        await userEvent.click(
          await screen.findByTestId(`case-action-popover-button-${theCase.id}`)
        );

        await userEvent.click(await screen.findByTestId(`case-action-status-panel-${theCase.id}`), {
          pointerEventsCheck: 0,
        });

        await userEvent.click(await screen.findByTestId(`cases-bulk-action-status-${status}`));

        await waitFor(() => {
          expect(updateCasesSpy).toHaveBeenCalledWith({
            cases: [{ id: theCase.id, status, version: theCase.version }],
          });
        });
      });

      it.each(severityTests)('update the severity of a case: %s', async (severity) => {
        appMockRenderer.render(<AllCasesList />);
        const lowCase = useGetCasesMockState.data.cases[0];
        const mediumCase = useGetCasesMockState.data.cases[1];
        const theCase = severity === CaseSeverity.LOW ? mediumCase : lowCase;

        await userEvent.click(
          await screen.findByTestId(`case-action-popover-button-${theCase.id}`)
        );

        await userEvent.click(
          await screen.findByTestId(`case-action-severity-panel-${theCase.id}`),
          {
            pointerEventsCheck: 0,
          }
        );

        await userEvent.click(await screen.findByTestId(`cases-bulk-action-severity-${severity}`));

        await waitFor(() => {
          expect(updateCasesSpy).toHaveBeenCalledWith({
            cases: [{ id: theCase.id, severity, version: theCase.version }],
          });
        });
      });

      it('should delete a case', async () => {
        appMockRenderer.render(<AllCasesList />);
        const theCase = defaultGetCases.data.cases[0];

        await userEvent.click(
          await screen.findByTestId(`case-action-popover-button-${theCase.id}`)
        );

        await userEvent.click(await screen.findByTestId('cases-bulk-action-delete'), {
          pointerEventsCheck: 0,
        });

        expect(await screen.findByTestId('confirm-delete-case-modal')).toBeInTheDocument();

        await userEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

        await waitFor(() => {
          expect(deleteCasesSpy).toHaveBeenCalledWith({ caseIds: ['basic-case-id'] });
        });
      });

      it('should disable row actions when bulk selecting all cases', async () => {
        appMockRenderer.render(<AllCasesList />);

        await userEvent.click(await screen.findByTestId('checkboxSelectAll'));

        for (const theCase of defaultGetCases.data.cases) {
          expect(
            await screen.findByTestId(`case-action-popover-button-${theCase.id}`)
          ).toBeDisabled();
        }
      });

      it('should disable row actions when selecting a case', async () => {
        appMockRenderer.render(<AllCasesList />);
        const caseToSelect = defaultGetCases.data.cases[0];

        await userEvent.click(await screen.findByTestId(`checkboxSelectRow-${caseToSelect.id}`));

        for (const theCase of defaultGetCases.data.cases) {
          expect(
            await screen.findByTestId(`case-action-popover-button-${theCase.id}`)
          ).toBeDisabled();
        }
      });
    });

    describe('Assignees', () => {
      it('should hide the assignees column on basic license', async () => {
        useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => false });

        appMockRenderer.render(<AllCasesList />);

        expect(await screen.findByTestId('cases-table')).toBeTruthy();
        expect(screen.queryAllByTestId('case-table-column-assignee').length).toBe(0);
      });

      it('should show the assignees column on platinum license', async () => {
        useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => true });

        appMockRenderer.render(<AllCasesList />);

        expect(await screen.findByTestId('cases-table')).toBeTruthy();
        expect(screen.queryAllByTestId('case-table-column-assignee').length).toBeGreaterThan(0);
      });

      it('should hide the assignees filters on basic license', async () => {
        useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => false });

        appMockRenderer.render(<AllCasesList />);

        expect(await screen.findByTestId('cases-table')).toBeTruthy();
        expect(screen.queryAllByTestId('options-filter-popover-button-assignees').length).toBe(0);
      });

      it('should show the assignees filters on platinum license', async () => {
        useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => true });

        appMockRenderer.render(<AllCasesList />);

        expect(await screen.findByTestId('cases-table')).toBeTruthy();
        expect(
          screen.queryAllByTestId('options-filter-popover-button-assignees').length
        ).toBeGreaterThan(0);
      });

      it('should reset the assignees when deactivating the filter', async () => {
        useLicenseMock.mockReturnValue({ isAtLeastPlatinum: () => true });

        appMockRenderer.render(<AllCasesList />);

        // Opens assignees filter and checks an option
        const assigneesButton = await screen.findByTestId(
          'options-filter-popover-button-assignees'
        );
        await userEvent.click(assigneesButton);
        await userEvent.click(await screen.findByText('Damaged Raccoon'));
        expect(
          await within(assigneesButton).findByLabelText('1 active filters')
        ).toBeInTheDocument();

        // Deactivates assignees filter
        await userEvent.click(await screen.findByRole('button', { name: 'More' }));
        await waitForEuiPopoverOpen();
        await userEvent.click(await screen.findByRole('option', { name: 'Assignees' }));

        expect(useGetCasesMock).toHaveBeenLastCalledWith({
          filterOptions: {
            ...DEFAULT_FILTER_OPTIONS,
            assignees: [],
          },
          queryParams: DEFAULT_QUERY_PARAMS,
        });

        // Reopens assignees filter
        await userEvent.click(await screen.findByRole('option', { name: 'Assignees' }));
        // Opens the assignees popup
        await userEvent.click(assigneesButton);
        expect(await screen.findByLabelText('click to filter assignees')).toBeInTheDocument();
        expect(
          within(
            await screen.findByTestId('options-filter-popover-button-assignees')
          ).queryByLabelText('1 active filters')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Columns Popover', () => {
    it('renders the columns popover correctly', async () => {
      appMockRenderer.render(<AllCasesList isSelectorView={false} />);

      expect(await screen.findByTestId('column-selection-popover-button')).toBeInTheDocument();
    });

    it('does not render the columns popover when isSelectorView=true', () => {
      appMockRenderer.render(<AllCasesList isSelectorView={true} />);

      expect(screen.queryByTestId('column-selection-popover-button')).not.toBeInTheDocument();
    });
  });
});

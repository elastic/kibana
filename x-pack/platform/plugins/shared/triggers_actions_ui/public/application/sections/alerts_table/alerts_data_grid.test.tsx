/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FunctionComponent, useMemo, useReducer } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { AlertsDataGrid } from './alerts_data_grid';
import { BulkActionsState, AdditionalContext, RenderContext } from '../../../types';
import { EuiButtonIcon, EuiDataGridColumnCellAction, EuiFlexItem } from '@elastic/eui';
import { bulkActionsReducer } from './bulk_actions/reducer';
import { createAppMockRenderer, getJsDomPerformanceFix } from '../test_utils';
import { createCasesServiceMock } from './index.mock';
import { useCaseViewNavigation } from './cases/use_case_view_navigation';
import { act } from 'react-dom/test-utils';
import { AlertsTableContextProvider } from './contexts/alerts_table_context';
import {
  TestAlertsDataGridProps,
  BaseAlertsDataGridProps,
  mockDataGridProps,
  mockRenderContext,
  mockColumns,
  mockAlerts,
  mockBulkActionsState,
} from './alerts_data_grid.mock';
import {
  CELL_ACTIONS_EXPAND_TEST_ID,
  CELL_ACTIONS_POPOVER_TEST_ID,
  FIELD_BROWSER_BTN_TEST_ID,
  FIELD_BROWSER_CUSTOM_CREATE_BTN_TEST_ID,
  FIELD_BROWSER_TEST_ID,
} from './constants';

jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting$: jest.fn((value: string) => ['0,0']),
}));

// useKibana mock
const mockCaseService = createCasesServiceMock();
jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');

  return {
    ...original,
    useKibana: () => ({
      services: {
        cases: mockCaseService,
        notifications: {
          toasts: {
            addDanger: jest.fn(),
            addSuccess: jest.fn(),
          },
        },
      },
    }),
  };
});

jest.mock('./cases/use_case_view_navigation');

const cellActionOnClickMockedFn = jest.fn();

const { fix, cleanup } = getJsDomPerformanceFix();

beforeAll(() => {
  fix();
});

afterAll(() => {
  cleanup();
});

describe('AlertsDataGrid', () => {
  const useCaseViewNavigationMock = useCaseViewNavigation as jest.Mock;
  useCaseViewNavigationMock.mockReturnValue({ navigateToCaseView: jest.fn() });

  const TestComponent: React.FunctionComponent<
    Omit<TestAlertsDataGridProps, 'renderContext'> & {
      initialBulkActionsState?: BulkActionsState;
      renderContext?: Partial<RenderContext<AdditionalContext>>;
    }
  > = (props) => {
    const { AppWrapper } = useMemo(
      () => createAppMockRenderer({ queryClientContext: AlertsQueryContext }),
      []
    );

    const bulkActionsStore = useReducer(
      bulkActionsReducer,
      props.initialBulkActionsState || mockBulkActionsState
    );
    const renderContext = useMemo(
      () => ({
        ...mockRenderContext,
        bulkActionsStore,
        ...props.renderContext,
      }),
      [bulkActionsStore, props.renderContext]
    );

    return (
      <AppWrapper>
        <AlertsTableContextProvider value={renderContext}>
          <AlertsDataGrid {...({ ...props, renderContext } as BaseAlertsDataGridProps)} />
        </AlertsTableContextProvider>
      </AppWrapper>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Alerts table UI', () => {
    it('should support sorting', async () => {
      const { container } = render(<TestComponent {...mockDataGridProps} />);
      await userEvent.click(container.querySelector('.euiDataGridHeaderCell__button')!, {
        pointerEventsCheck: 0,
      });

      await waitForEuiPopoverOpen();

      await userEvent.click(
        screen.getByTestId(`dataGridHeaderCellActionGroup-${mockColumns[0].id}`),
        {
          pointerEventsCheck: 0,
        }
      );

      await userEvent.click(screen.getByTitle('Sort A-Z'), {
        pointerEventsCheck: 0,
      });

      expect(mockDataGridProps.onSortChange).toHaveBeenCalledWith([
        { direction: 'asc', id: 'kibana.alert.rule.name' },
      ]);
    });

    it('should support pagination', async () => {
      render(<TestComponent {...mockDataGridProps} />);
      await userEvent.click(screen.getByTestId('pagination-button-1'), {
        pointerEventsCheck: 0,
      });

      expect(mockDataGridProps.onChangePageIndex).toHaveBeenCalledWith(1);
    });

    it('should show when it was updated', () => {
      render(<TestComponent {...mockDataGridProps} />);
      expect(screen.getByTestId('toolbar-updated-at')).not.toBe(null);
    });

    it('should show alerts count', () => {
      render(<TestComponent {...mockDataGridProps} />);
      expect(screen.getByTestId('toolbar-alerts-count')).not.toBe(null);
    });

    it('should show alert status', () => {
      render(
        <TestComponent
          {...mockDataGridProps}
          renderContext={{
            renderCellValue: undefined,
            pageSize: 10,
          }}
        />
      );
      expect(screen.queryAllByTestId('alertLifecycleStatusBadge')[0].textContent).toEqual(
        'Flapping'
      );
      expect(screen.queryAllByTestId('alertLifecycleStatusBadge')[1].textContent).toEqual('Active');
      expect(screen.queryAllByTestId('alertLifecycleStatusBadge')[2].textContent).toEqual(
        'Recovered'
      );
      expect(screen.queryAllByTestId('alertLifecycleStatusBadge')[3].textContent).toEqual(
        'Recovered'
      );
    });

    describe('leading control columns', () => {
      it('should render other leading controls', () => {
        const props: TestAlertsDataGridProps = {
          ...mockDataGridProps,
          leadingControlColumns: [
            {
              id: 'selection',
              width: 67,
              headerCellRender: () => <span data-test-subj="testHeader">Test header</span>,
              rowCellRender: () => <h2 data-test-subj="testCell">Test cell</h2>,
            },
          ],
        };
        render(<TestComponent {...props} />);
        expect(screen.queryByTestId('testHeader')).not.toBe(null);
        expect(screen.queryByTestId('testCell')).not.toBe(null);
      });
    });

    describe('actions column', () => {
      it('should render custom actions cells', () => {
        render(
          <TestComponent
            {...mockDataGridProps}
            renderContext={{
              renderActionsCell: () => (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="analyzeEvent"
                      color="primary"
                      onClick={() => {}}
                      size="s"
                      data-test-subj="testAction"
                      aria-label="testActionLabel"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="analyzeEvent"
                      color="primary"
                      onClick={() => {}}
                      size="s"
                      data-test-subj="testAction2"
                      aria-label="testActionLabel2"
                    />
                  </EuiFlexItem>
                </>
              ),
            }}
          />
        );
        expect(screen.queryByTestId('testAction')).toBeInTheDocument();
        expect(screen.queryByTestId('testAction2')).toBeInTheDocument();
        expect(screen.queryByTestId('expandColumnCellOpenFlyoutButton-0')).not.toBeInTheDocument();
      });

      it('should render no action column if there is neither the action nor the expand action config is set', () => {
        render(
          <TestComponent
            {...mockDataGridProps}
            renderContext={{
              renderActionsCell: undefined,
            }}
          />
        );
        expect(screen.queryByTestId('expandColumnHeaderLabel')).not.toBeInTheDocument();
        expect(screen.queryByTestId('expandColumnCellOpenFlyoutButton')).not.toBeInTheDocument();
      });

      describe('row loading state on action', () => {
        type ExtractFunctionComponent<T> = T extends FunctionComponent<infer P> ? T : never;
        const mockRenderActionsCell = jest.fn(
          mockRenderContext.renderActionsCell as ExtractFunctionComponent<
            typeof mockRenderContext.renderActionsCell
          >
        );
        const props: TestAlertsDataGridProps = {
          ...mockDataGridProps,
          actionsColumnWidth: 124,
          renderContext: {
            pageSize: 10,
            renderActionsCell: mockRenderActionsCell,
          },
        };

        it('should show the row loader when callback triggered', async () => {
          render(<TestComponent {...props} />);
          fireEvent.click((await screen.findAllByTestId('testAction'))[0]);

          // the callback given to our clients to run when they want to update the loading state
          act(() => {
            mockRenderActionsCell.mock.calls[0][0].setIsActionLoading!(true);
          });

          expect(await screen.findAllByTestId('row-loader')).toHaveLength(1);
          const selectedOptions = await screen.findAllByTestId('dataGridRowCell');

          // first row, first column
          expect(within(selectedOptions[0]).getByLabelText('Loading')).toBeDefined();
          expect(
            within(selectedOptions[0]).queryByTestId('bulk-actions-row-cell')
          ).not.toBeInTheDocument();

          // second row, first column
          expect(within(selectedOptions[6]).queryByLabelText('Loading')).not.toBeInTheDocument();
          expect(within(selectedOptions[6]).getByTestId('bulk-actions-row-cell')).toBeDefined();
        });

        it('should show the row loader when callback triggered with false', async () => {
          const initialBulkActionsState = {
            ...mockBulkActionsState,
            rowSelection: new Map([[0, { isLoading: true }]]),
          };

          render(<TestComponent {...props} initialBulkActionsState={initialBulkActionsState} />);
          fireEvent.click((await screen.findAllByTestId('testAction'))[0]);

          // the callback given to our clients to run when they want to update the loading state
          act(() => {
            mockRenderActionsCell.mock.calls[0][0].setIsActionLoading!(false);
          });

          expect(screen.queryByTestId('row-loader')).not.toBeInTheDocument();
        });
      });
    });

    describe('cell Actions', () => {
      const mockGetCellActionsForColumn = jest.fn(
        (columnId: string): EuiDataGridColumnCellAction[] => [
          ({ rowIndex, Component }) => {
            const label = 'Fake Cell First Action';
            return (
              <Component
                onClick={() => cellActionOnClickMockedFn(columnId, rowIndex)}
                data-test-subj={'fake-cell-first-action'}
                iconType="refresh"
                aria-label={label}
              />
            );
          },
        ]
      );
      const props: TestAlertsDataGridProps = {
        ...mockDataGridProps,
        cellActionsOptions: {
          getCellActionsForColumn: mockGetCellActionsForColumn,
          visibleCellActions: 2,
          disabledCellActions: [],
        },
      };

      it('should render cell actions on hover', async () => {
        render(<TestComponent {...props} />);

        const reasonFirstRow = (await screen.findAllByTestId('dataGridRowCell'))[3];

        fireEvent.mouseOver(reasonFirstRow);

        expect(await screen.findByTestId('fake-cell-first-action')).toBeInTheDocument();
      });

      it('should render expandable cell actions', async () => {
        render(<TestComponent {...props} />);
        const reasonFirstRow = (await screen.findAllByTestId('dataGridRowCell'))[3];

        fireEvent.mouseOver(reasonFirstRow);

        expect(await screen.findByTestId(CELL_ACTIONS_EXPAND_TEST_ID)).toBeVisible();

        fireEvent.click(await screen.findByTestId(CELL_ACTIONS_EXPAND_TEST_ID));

        expect(await screen.findByTestId(CELL_ACTIONS_POPOVER_TEST_ID)).toBeVisible();
        expect(await screen.findAllByLabelText(/fake cell first action/i)).toHaveLength(2);
      });
    });

    describe('Fields browser', () => {
      it('fields browser is working correctly', async () => {
        render(
          <TestComponent
            {...mockDataGridProps}
            initialBulkActionsState={{
              ...mockBulkActionsState,
              rowSelection: new Map(),
            }}
          />
        );

        const fieldBrowserBtn = screen.getByTestId(FIELD_BROWSER_BTN_TEST_ID);
        expect(fieldBrowserBtn).toBeVisible();

        fireEvent.click(fieldBrowserBtn);

        expect(await screen.findByTestId(FIELD_BROWSER_TEST_ID)).toBeVisible();

        expect(await screen.findByTestId(FIELD_BROWSER_CUSTOM_CREATE_BTN_TEST_ID)).toBeVisible();
      });

      it('syncs the columns state correctly between the column selector and the field selector', async () => {
        const columnToHide = mockColumns[0];
        render(
          <TestComponent
            {...mockDataGridProps}
            toolbarVisibility={{
              showColumnSelector: true,
            }}
            initialBulkActionsState={{
              ...mockBulkActionsState,
              rowSelection: new Map(),
            }}
          />
        );

        const fieldBrowserBtn = await screen.findByTestId(FIELD_BROWSER_BTN_TEST_ID);
        const columnSelectorBtn = await screen.findByTestId('dataGridColumnSelectorButton');

        // Open the column visibility selector and hide the column
        fireEvent.click(columnSelectorBtn);
        const columnVisibilityToggle = await screen.findByTestId(
          `dataGridColumnSelectorToggleColumnVisibility-${columnToHide.id}`
        );
        fireEvent.click(columnVisibilityToggle);

        // Open the field browser
        fireEvent.click(fieldBrowserBtn);
        expect(await screen.findByTestId(FIELD_BROWSER_TEST_ID)).toBeVisible();

        // The column should be checked in the field browser, independent of its visibility status
        const columnCheckbox: HTMLInputElement = await screen.findByTestId(
          `field-${columnToHide.id}-checkbox`
        );
        expect(columnCheckbox).toBeChecked();
      });
    });

    describe('cases column', () => {
      const props: TestAlertsDataGridProps = {
        ...mockDataGridProps,
        renderContext: {
          pageSize: mockAlerts.length,
        },
      };

      it('should show the cases column', async () => {
        render(<TestComponent {...props} />);
        expect(await screen.findByText('Cases')).toBeInTheDocument();
      });

      it('should show the cases titles correctly', async () => {
        render(<TestComponent {...props} renderContext={{ pageSize: 10 }} />);
        expect(await screen.findByText('Test case')).toBeInTheDocument();
        expect(await screen.findByText('Test case 2')).toBeInTheDocument();
      });

      it('show loading skeleton if it loads cases', async () => {
        render(
          <TestComponent
            {...props}
            renderContext={{
              pageSize: 10,
              isLoading: true,
              isLoadingCases: true,
            }}
          />
        );

        expect((await screen.findAllByTestId('cases-cell-loading')).length).toBe(4);
      });

      it('shows the cases tooltip', async () => {
        render(<TestComponent {...props} />);
        expect(await screen.findByText('Test case')).toBeInTheDocument();

        await userEvent.hover(screen.getByText('Test case'));

        expect(await screen.findByTestId('cases-components-tooltip')).toBeInTheDocument();
      });
    });

    describe('dynamic row height mode', () => {
      it('should render a non-virtualized grid body when the dynamicRowHeight option is on', async () => {
        const { container } = render(<TestComponent {...mockDataGridProps} dynamicRowHeight />);

        expect(container.querySelector('.euiDataGrid__customRenderBody')).toBeTruthy();
      });

      it('should render a virtualized grid body when the dynamicRowHeight option is off', async () => {
        const { container } = render(<TestComponent {...mockDataGridProps} />);

        expect(container.querySelector('.euiDataGrid__virtualized')).toBeTruthy();
      });
    });
  });
});

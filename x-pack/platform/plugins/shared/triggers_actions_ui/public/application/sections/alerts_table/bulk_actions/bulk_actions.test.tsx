/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useReducer } from 'react';
import { identity } from 'lodash';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { FieldFormatsRegistry } from '@kbn/field-formats-plugin/common';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { AlertsTable } from '../alerts_table';
import {
  Alerts,
  AlertsField,
  AlertsTableProps,
  BulkActionsConfig,
  BulkActionsState,
  FetchAlertData,
  InspectQuery,
  RowSelectionState,
} from '../../../../types';
import { bulkActionsReducer } from './reducer';
import { createAppMockRenderer } from '../../test_utils';
import { getCasesMockMap } from '../cases/index.mock';
import { getMaintenanceWindowMockMap } from '../maintenance_windows/index.mock';
import { createCasesServiceMock } from '../index.mock';
import { AlertsTableContext } from '../contexts/alerts_table_context';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';

jest.mock('@kbn/data-plugin/public');
jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting$: jest.fn((value: string) => ['0,0']),
}));

const refreshMockFn = jest.fn();

const columns = [
  {
    id: AlertsField.name,
    displayAsText: 'Name',
  },
  {
    id: AlertsField.reason,
    displayAsText: 'Reason',
  },
];

const mockFieldFormatsRegistry = {
  deserialize: jest.fn().mockImplementation(() => ({
    id: 'string',
    convert: jest.fn().mockImplementation(identity),
  })),
} as unknown as FieldFormatsRegistry;

const mockCaseService = createCasesServiceMock();

const mockKibana = jest.fn().mockReturnValue({
  services: {
    cases: mockCaseService,
    notifications: {
      toasts: {
        addDanger: jest.fn(),
        addSuccess: jest.fn(),
      },
    },
  },
});

const oldAlertsData = [
  [
    {
      field: AlertsField.name,
      value: ['one'],
    },
    {
      field: AlertsField.reason,
      value: ['two'],
    },
  ],
  [
    {
      field: AlertsField.name,
      value: ['three'],
    },
    {
      field: AlertsField.reason,
      value: ['four'],
    },
  ],
] as FetchAlertData['oldAlertsData'];

const ecsAlertsData = [
  [
    {
      '@timestamp': ['2023-01-28T10:48:49.559Z'],
      _id: 'SomeId',
      _index: 'SomeIndex',
      kibana: {
        alert: {
          rule: {
            name: ['one'],
          },
          reason: ['two'],
        },
      },
    },
  ],
  [
    {
      '@timestamp': ['2023-01-27T10:48:49.559Z'],
      _id: 'SomeId2',
      _index: 'SomeIndex',
      kibana: {
        alert: {
          rule: {
            name: ['three'],
          },
          reason: ['four'],
        },
      },
    },
  ],
] as FetchAlertData['ecsAlertsData'];

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');

  return {
    ...original,
    useKibana: () => mockKibana(),
  };
});

const originalGetComputedStyle = Object.assign({}, window.getComputedStyle);

type AlertsTableWithBulkActionsContextProps = AlertsTableProps & {
  initialBulkActionsState?: BulkActionsState;
};

describe('AlertsTable.BulkActions', () => {
  beforeAll(() => {
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
  });

  afterAll(() => {
    Object.defineProperty(window, 'getComputedStyle', originalGetComputedStyle);
  });

  const alerts = [
    {
      [AlertsField.name]: ['one'],
      [AlertsField.reason]: ['two'],
      [AlertsField.uuid]: ['uuidone'],
      _id: 'alert0',
      _index: 'idx0',
    },
    {
      [AlertsField.name]: ['three'],
      [AlertsField.reason]: ['four'],
      [AlertsField.uuid]: ['uuidtwo'],
      _id: 'alert1',
      _index: 'idx1',
    },
  ] as unknown as Alerts;

  const alertsData: FetchAlertData = {
    activePage: 0,
    alerts,
    ecsAlertsData: [],
    oldAlertsData: [],
    alertsCount: alerts.length,
    isInitializing: false,
    isLoading: false,
    getInspectQuery: () => ({ request: {}, response: {} } as InspectQuery),
    onPageChange: () => {},
    onSortChange: () => {},
    refresh: refreshMockFn,
    sort: [],
  };

  const casesConfig = { featureId: 'test-feature-id', owner: ['test-owner'] };

  const alertsTableConfiguration = {
    id: '',
    casesConfig,
    columns,
    sort: [],
    useInternalFlyout: jest.fn().mockImplementation(() => ({
      header: jest.fn(),
      body: jest.fn(),
      footer: jest.fn(),
    })),
    getRenderCellValue: jest.fn().mockImplementation((props) => {
      return `${props.colIndex}:${props.rowIndex}`;
    }),
  };

  const casesMap = getCasesMockMap();

  const maintenanceWindowsMap = getMaintenanceWindowMockMap();

  const tableProps: AlertsTableProps = {
    alertsTableConfiguration,
    cases: { data: casesMap, isLoading: false },
    maintenanceWindows: { data: maintenanceWindowsMap, isLoading: false },
    columns,
    deletedEventIds: [],
    disabledCellActions: [],
    pageSizeOptions: [2, 4],
    leadingControlColumns: [],
    trailingControlColumns: [],
    visibleColumns: columns.map((c) => c.id),
    'data-test-subj': 'testTable',
    onToggleColumn: () => {},
    onResetColumns: () => {},
    onChangeVisibleColumns: () => {},
    browserFields: {},
    query: {},
    pageIndex: 0,
    pageSize: 1,
    sort: [],
    isLoading: false,
    alerts,
    oldAlertsData,
    ecsAlertsData,
    querySnapshot: { request: [], response: [] },
    refetchAlerts: refreshMockFn,
    alertsCount: alerts.length,
    onSortChange: () => {},
    onPageChange: () => {},
    fieldFormats: mockFieldFormatsRegistry,
  };

  const tablePropsWithBulkActions: AlertsTableWithBulkActionsContextProps = {
    ...tableProps,
    pageIndex: 0,
    pageSize: 10,
    alertsTableConfiguration: {
      ...alertsTableConfiguration,

      useBulkActions: () => [
        {
          id: 0,
          items: [
            {
              label: 'Fake Bulk Action',
              key: 'fakeBulkAction',
              'data-test-subj': 'fake-bulk-action',
              disableOnQuery: false,
              onClick: () => {},
            },
            {
              label: 'Fake Bulk Action with clear selection',
              key: 'fakeBulkActionClear',
              'data-test-subj': 'fake-bulk-action-clear',
              disableOnQuery: false,
              onClick: (ids, isSelectAll, setIsBulkActionLoading, clearSelection, refresh) => {
                clearSelection();
              },
            },
            {
              label: 'Fake Bulk Action with loading and clear selection',
              key: 'fakeBulkActionLoadingClear',
              'data-test-subj': 'fake-bulk-action-loading',
              disableOnQuery: false,
              onClick: (ids, isSelectAll, setIsBulkActionLoading, clearSelection, refresh) => {
                setIsBulkActionLoading(true);
              },
            },
            {
              label: 'Fake Bulk Action with refresh Action',
              key: 'fakeBulkActionRefresh',
              'data-test-subj': 'fake-bulk-action-refresh',
              disableOnQuery: false,
              onClick: (ids, isSelectAll, setIsBulkActionLoading, clearSelection, refresh) => {
                refresh();
              },
            },
          ] as BulkActionsConfig[],
        },
        {
          id: 1,
          renderContent: () => <></>,
        },
      ],
    },
  };

  const defaultBulkActionsState = {
    rowSelection: new Map<number, RowSelectionState>(),
    isAllSelected: false,
    areAllVisibleRowsSelected: false,
    rowCount: 2,
    updatedAt: Date.now(),
  };

  const AlertsTableWithBulkActionsContext: React.FunctionComponent<
    AlertsTableWithBulkActionsContextProps
  > = (props) => {
    const renderer = useMemo(() => createAppMockRenderer(AlertsQueryContext), []);
    const AppWrapper = renderer.AppWrapper;

    const initialBulkActionsState = useReducer(
      bulkActionsReducer,
      props.initialBulkActionsState || defaultBulkActionsState
    );

    return (
      <AppWrapper>
        <AlertsTableContext.Provider
          value={{
            mutedAlerts: {},
            bulkActions: initialBulkActionsState,
          }}
        >
          <AlertsTable {...props} />
        </AlertsTableContext.Provider>
      </AppWrapper>
    );
  };

  describe('when the bulk action hook is not set', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should not show the bulk actions column', () => {
      const { queryByTestId } = render(<AlertsTableWithBulkActionsContext {...tableProps} />);
      expect(queryByTestId('bulk-actions-header')).toBeNull();
    });
  });

  describe('Cases', () => {
    beforeAll(() => {
      mockCaseService.helpers.canUseCases = jest.fn().mockReturnValue({ create: true, read: true });
      mockCaseService.ui.getCasesContext = jest.fn().mockReturnValue(() => 'Cases context');
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    afterAll(() => {
      mockCaseService.ui.getCasesContext = jest.fn().mockReturnValue(() => null);
    });

    it('should show the bulk actions column when the cases service is defined', () => {
      mockCaseService.helpers.canUseCases = jest.fn().mockReturnValue({ create: true, read: true });

      const { getByTestId } = render(<AlertsTableWithBulkActionsContext {...tableProps} />);
      expect(getByTestId('bulk-actions-header')).toBeDefined();
    });

    it('should not show the bulk actions column when the case service is defined and the user does not have write access', () => {
      mockCaseService.helpers.canUseCases = jest
        .fn()
        .mockReturnValue({ create: false, read: true });

      const { queryByTestId } = render(<AlertsTableWithBulkActionsContext {...tableProps} />);

      expect(queryByTestId('bulk-actions-header')).toBeNull();
    });

    it('should not show the bulk actions column when the case service is defined and the user does not have read access', () => {
      mockCaseService.helpers.canUseCases = jest
        .fn()
        .mockReturnValue({ create: true, read: false });

      const { queryByTestId } = render(<AlertsTableWithBulkActionsContext {...tableProps} />);

      expect(queryByTestId('bulk-actions-header')).toBeNull();
    });

    it('should not show the bulk actions when the cases context is missing', () => {
      mockCaseService.ui.getCasesContext = jest.fn().mockReturnValue(() => null);

      const { queryByTestId } = render(<AlertsTableWithBulkActionsContext {...tableProps} />);
      expect(queryByTestId('bulk-actions-header')).toBeNull();
    });

    it('should pass the case ids when selecting alerts', async () => {
      const mockedFn = jest.fn();
      const newAlertsData = {
        ...alertsData,
        alerts: [
          {
            [AlertsField.name]: ['one'],
            [AlertsField.reason]: ['two'],
            [AlertsField.uuid]: ['uuidone'],
            [AlertsField.case_ids]: ['test-case'],
            _id: 'alert0',
            _index: 'idx0',
          },
        ] as unknown as Alerts,
      };

      const props: AlertsTableWithBulkActionsContextProps = {
        ...tablePropsWithBulkActions,
        initialBulkActionsState: {
          ...defaultBulkActionsState,
          isAllSelected: true,
          rowCount: 1,
          rowSelection: new Map([[0, { isLoading: false }]]),
        },
        alerts: newAlertsData.alerts,
        alertsTableConfiguration: {
          ...alertsTableConfiguration,
          useBulkActions: () => [
            {
              id: 0,
              items: [
                {
                  label: 'Fake Bulk Action',
                  key: 'fakeBulkAction',
                  'data-test-subj': 'fake-bulk-action',
                  disableOnQuery: false,
                  onClick: mockedFn,
                },
              ],
            },
          ],
        },
      };

      render(<AlertsTableWithBulkActionsContext {...props} />);

      fireEvent.click(await screen.findByTestId('selectedShowBulkActionsButton'));
      await waitForEuiPopoverOpen();

      fireEvent.click(await screen.findByText('Fake Bulk Action'));

      expect(mockedFn.mock.calls[0][0]).toEqual([
        {
          _id: 'alert0',
          _index: 'idx0',
          data: [
            {
              field: 'kibana.alert.rule.name',
              value: ['one'],
            },
            {
              field: 'kibana.alert.rule.uuid',
              value: ['uuidone'],
            },
            {
              field: 'kibana.alert.case_ids',
              value: ['test-case'],
            },
            {
              field: 'kibana.alert.workflow_tags',
              value: [],
            },
            {
              field: 'kibana.alert.workflow_assignee_ids',
              value: [],
            },
          ],
          ecs: {
            _id: 'alert0',
            _index: 'idx0',
          },
        },
      ]);
    });
  });

  describe('when the bulk action hook is set', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should show the bulk actions column', () => {
      const { getByTestId } = render(
        <AlertsTableWithBulkActionsContext {...tablePropsWithBulkActions} />
      );
      expect(getByTestId('bulk-actions-header')).toBeDefined();
    });

    describe('and click on select all', () => {
      it('should check that all rows are selected', async () => {
        render(<AlertsTableWithBulkActionsContext {...tablePropsWithBulkActions} />);
        let bulkActionsCells = screen.getAllByTestId('bulk-actions-row-cell') as HTMLInputElement[];
        expect(bulkActionsCells[0].checked).toBeFalsy();
        expect(bulkActionsCells[1].checked).toBeFalsy();

        fireEvent.click(screen.getByTestId('bulk-actions-header'));

        bulkActionsCells = screen.getAllByTestId('bulk-actions-row-cell') as HTMLInputElement[];
        expect(bulkActionsCells[0].checked).toBeTruthy();
        expect(bulkActionsCells[1].checked).toBeTruthy();
      });

      it('should show the right amount of alerts selected', async () => {
        const props = {
          ...tablePropsWithBulkActions,
          initialBulkActionsState: {
            ...defaultBulkActionsState,
            areAllVisibleRowsSelected: true,
            rowSelection: new Map([
              [0, { isLoading: false }],
              [1, { isLoading: false }],
            ]),
          },
        };

        render(<AlertsTableWithBulkActionsContext {...props} />);
        expect(await screen.findByText('Selected 2 alerts')).toBeDefined();
      });

      describe('and clicking on a single row', () => {
        it('should uncheck the select all header column', () => {
          // state after having already clicked on select all before
          const props = {
            ...tablePropsWithBulkActions,
            initialBulkActionsState: {
              ...defaultBulkActionsState,
              areAllVisibleRowsSelected: true,
              rowSelection: new Map([
                [0, { isLoading: false }],
                [1, { isLoading: false }],
              ]),
            },
          };
          render(<AlertsTableWithBulkActionsContext {...props} />);
          const bulkActionsCells = screen.getAllByTestId(
            'bulk-actions-row-cell'
          ) as HTMLInputElement[];
          expect(
            (screen.getByTestId('bulk-actions-header') as HTMLInputElement).checked
          ).toBeTruthy();

          fireEvent.click(bulkActionsCells[1]);
          expect(
            (screen.getByTestId('bulk-actions-header') as HTMLInputElement).checked
          ).toBeFalsy();
        });
      });

      describe('and its a page with count of alerts different than page size', () => {
        it('should show the right amount of alerts selected', async () => {
          const secondPageAlerts = [
            {
              [AlertsField.name]: ['five'],
              [AlertsField.reason]: ['six'],
              _id: 'alert2',
            },
          ] as unknown as Alerts;
          const allAlerts = [...alerts, ...secondPageAlerts];
          const props: AlertsTableWithBulkActionsContextProps = {
            ...tablePropsWithBulkActions,
            alerts: allAlerts,
            alertsCount: allAlerts.length,
            initialBulkActionsState: {
              ...defaultBulkActionsState,
              areAllVisibleRowsSelected: true,
              rowSelection: new Map([[0, { isLoading: false }]]),
            },
            pageIndex: 1,
            pageSize: 2,
          };
          render(<AlertsTableWithBulkActionsContext {...props} />);

          expect(await screen.findByText('Selected 1 alert')).toBeDefined();
          expect((await screen.findAllByTestId('bulk-actions-row-cell')).length).toBe(1);
        });
      });
    });

    describe('and clicking unselect all', () => {
      it('should uncheck all rows', async () => {
        // state after having already clicked on select all before
        const props = {
          ...tablePropsWithBulkActions,
          initialBulkActionsState: {
            ...defaultBulkActionsState,
            areAllVisibleRowsSelected: true,
            rowSelection: new Map([
              [0, { isLoading: false }],
              [1, { isLoading: false }],
            ]),
          },
        };
        render(<AlertsTableWithBulkActionsContext {...props} />);
        expect(
          ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0].checked
        ).toBeTruthy();
        expect(
          ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1].checked
        ).toBeTruthy();

        fireEvent.click(await screen.findByTestId('bulk-actions-header'));

        expect(
          ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0].checked
        ).toBeFalsy();
        expect(
          ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1].checked
        ).toBeFalsy();
      });
    });

    describe('and a row is selected', () => {
      it('should show the toolbar', async () => {
        render(<AlertsTableWithBulkActionsContext {...tablePropsWithBulkActions} />);

        expect(screen.queryByTestId('selectedShowBulkActionsButton')).toBeNull();
        expect(screen.queryByTestId('selectAllAlertsButton')).toBeNull();

        const bulkActionsCells = screen.getAllByTestId(
          'bulk-actions-row-cell'
        ) as HTMLInputElement[];
        fireEvent.click(bulkActionsCells[0]);

        expect(await screen.findByTestId('selectedShowBulkActionsButton')).toBeDefined();
        expect(await screen.findByTestId('selectAllAlertsButton')).toBeDefined();
      });

      describe('and the last remaining row is unchecked', () => {
        it('should hide the toolbar', () => {
          // state after having already clicked on select all before
          const props = {
            ...tablePropsWithBulkActions,
            initialBulkActionsState: {
              ...defaultBulkActionsState,
              rowSelection: new Map([[0, { isLoading: false }]]),
            },
          };
          const { queryByTestId, getAllByTestId, getByTestId } = render(
            <AlertsTableWithBulkActionsContext {...props} />
          );

          expect(getByTestId('selectedShowBulkActionsButton')).toBeDefined();
          expect(getByTestId('selectAllAlertsButton')).toBeDefined();

          const bulkActionsCells = getAllByTestId('bulk-actions-row-cell') as HTMLInputElement[];
          fireEvent.click(bulkActionsCells[0]);

          expect(queryByTestId('selectAllAlertsButton')).toBeNull();
          expect(queryByTestId('selectedShowBulkActionsButton')).toBeNull();
        });
      });
    });

    describe('and the toolbar is on ', () => {
      describe('and a bulk action is executed', () => {
        it('should return the selected alert ids', async () => {
          const mockedFn = jest.fn();
          const props = {
            ...tablePropsWithBulkActions,
            initialBulkActionsState: {
              ...defaultBulkActionsState,
              rowSelection: new Map([[1, { isLoading: false }]]),
            },
            alertsTableConfiguration: {
              ...alertsTableConfiguration,
              useBulkActions: () => [
                {
                  id: 0,
                  items: [
                    {
                      label: 'Fake Bulk Action',
                      key: 'fakeBulkAction',
                      'data-test-subj': 'fake-bulk-action',
                      disableOnQuery: false,
                      onClick: mockedFn,
                    },
                  ],
                },
              ],
            },
          };

          render(<AlertsTableWithBulkActionsContext {...props} />);

          fireEvent.click(await screen.findByTestId('selectedShowBulkActionsButton'));
          await waitForEuiPopoverOpen();

          fireEvent.click(await screen.findByText('Fake Bulk Action'));
          expect(mockedFn.mock.calls[0][0]).toEqual([
            {
              _id: 'alert1',
              _index: 'idx1',
              data: [
                {
                  field: 'kibana.alert.rule.name',
                  value: ['three'],
                },
                {
                  field: 'kibana.alert.rule.uuid',
                  value: ['uuidtwo'],
                },
                {
                  field: 'kibana.alert.case_ids',
                  value: [],
                },
                {
                  field: 'kibana.alert.workflow_tags',
                  value: [],
                },
                {
                  field: 'kibana.alert.workflow_assignee_ids',
                  value: [],
                },
              ],
              ecs: {
                _id: 'alert1',
                _index: 'idx1',
              },
            },
          ]);
          expect(mockedFn.mock.calls[0][1]).toEqual(false);
          expect(mockedFn.mock.calls[0][2]).toBeDefined(); // it's a callback
        });

        describe('and the callback to represent the loading state is executed', () => {
          let mockedFn: jest.Mock;
          let props: AlertsTableProps;

          beforeEach(() => {
            mockedFn = jest.fn();
            props = {
              ...tablePropsWithBulkActions,
              alertsTableConfiguration: {
                ...alertsTableConfiguration,
                useBulkActions: () => [
                  {
                    id: 0,
                    items: [
                      {
                        label: 'Fake Bulk Action',
                        key: 'fakeBulkAction',
                        'data-test-subj': 'fake-bulk-action',
                        disableOnQuery: false,
                        onClick: mockedFn,
                      },
                    ],
                  },
                ],
              },
            };
          });

          it('should show the loading state on each selected row', async () => {
            const initialBulkActionsState = {
              ...defaultBulkActionsState,
              rowSelection: new Map([[1, { isLoading: false }]]),
            };
            render(
              <AlertsTableWithBulkActionsContext
                {...props}
                initialBulkActionsState={initialBulkActionsState}
              />
            );

            fireEvent.click(await screen.findByTestId('selectedShowBulkActionsButton'));
            await waitForEuiPopoverOpen();

            fireEvent.click(await screen.findByText('Fake Bulk Action'));

            // the callback given to our clients to run when they want to update the loading state
            mockedFn.mock.calls[0][2](true);

            expect(await screen.findAllByTestId('row-loader')).toHaveLength(1);
            const selectedOptions = await screen.findAllByTestId('dataGridRowCell');
            // first row, first column
            expect(within(selectedOptions[0]).queryByLabelText('Loading')).not.toBeInTheDocument();
            expect(within(selectedOptions[0]).getByRole('checkbox')).toBeDefined();

            // second row, first column
            expect(within(selectedOptions[3]).getByLabelText('Loading')).toBeDefined();
            expect(within(selectedOptions[3]).queryByRole('checkbox')).not.toBeInTheDocument();
          });

          it('should hide the loading state on each selected row', async () => {
            const initialBulkActionsState = {
              ...defaultBulkActionsState,
              rowSelection: new Map([[1, { isLoading: true }]]),
            };
            render(
              <AlertsTableWithBulkActionsContext
                {...props}
                initialBulkActionsState={initialBulkActionsState}
              />
            );
            fireEvent.click(await screen.findByTestId('selectedShowBulkActionsButton'));
            await waitForEuiPopoverOpen();

            fireEvent.click(await screen.findByText('Fake Bulk Action'));

            // the callback given to our clients to run when they want to update the loading state
            mockedFn.mock.calls[0][2](false);

            expect(screen.queryByTestId('row-loader')).not.toBeInTheDocument();
          });
        });
      });

      describe('and select all is clicked', () => {
        it('should check all the visible rows', async () => {
          const props = {
            ...tablePropsWithBulkActions,
            initialBulkActionsState: {
              ...defaultBulkActionsState,
              rowSelection: new Map([[0, { isLoading: false }]]),
            },
          };

          render(<AlertsTableWithBulkActionsContext {...props} />);

          expect(
            ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0]
              .checked
          ).toBeTruthy();
          expect(
            ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1]
              .checked
          ).toBeFalsy();

          fireEvent.click(screen.getByTestId('selectAllAlertsButton'));

          expect(
            ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0]
              .checked
          ).toBeTruthy();
          expect(
            ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1]
              .checked
          ).toBeTruthy();
        });

        describe('and clear the selection is clicked', () => {
          it('should turn off the toolbar', async () => {
            const props = {
              ...tablePropsWithBulkActions,
              initialBulkActionsState: {
                ...defaultBulkActionsState,
                areAllVisibleRowsSelected: true,
                isAllSelected: true,
                rowSelection: new Map([
                  [0, { isLoading: false }],
                  [1, { isLoading: false }],
                ]),
              },
            };

            render(<AlertsTableWithBulkActionsContext {...props} />);

            expect(
              ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0]
                .checked
            ).toBeTruthy();
            expect(
              ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1]
                .checked
            ).toBeTruthy();

            fireEvent.click(screen.getByTestId('selectAllAlertsButton'));

            expect(
              ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[0]
                .checked
            ).toBeFalsy();
            expect(
              ((await screen.findAllByTestId('bulk-actions-row-cell')) as HTMLInputElement[])[1]
                .checked
            ).toBeFalsy();
          });
        });

        describe('and executing a bulk action', () => {
          it('should return the are all selected flag set to true', async () => {
            const mockedFn = jest.fn();
            const props = {
              ...tablePropsWithBulkActions,
              initialBulkActionsState: {
                ...defaultBulkActionsState,
                isAllSelected: true,
                rowCount: 2,
                rowSelection: new Map([
                  [0, { isLoading: false }],
                  [1, { isLoading: false }],
                ]),
              },
              alertsTableConfiguration: {
                ...alertsTableConfiguration,
                useBulkActions: () => [
                  {
                    id: 0,
                    items: [
                      {
                        label: 'Fake Bulk Action',
                        key: 'fakeBulkAction',
                        'data-test-subj': 'fake-bulk-action',
                        disableOnQuery: false,
                        onClick: mockedFn,
                      },
                    ],
                  },
                ],
              },
            };

            const { getByText, getByTestId } = render(
              <AlertsTableWithBulkActionsContext {...props} />
            );

            fireEvent.click(getByTestId('selectedShowBulkActionsButton'));
            await waitForEuiPopoverOpen();

            fireEvent.click(getByText('Fake Bulk Action'));
            expect(mockedFn.mock.calls[0][0]).toEqual([
              {
                _id: 'alert0',
                _index: 'idx0',
                data: [
                  {
                    field: 'kibana.alert.rule.name',
                    value: ['one'],
                  },
                  {
                    field: 'kibana.alert.rule.uuid',
                    value: ['uuidone'],
                  },
                  {
                    field: 'kibana.alert.case_ids',
                    value: [],
                  },
                  {
                    field: 'kibana.alert.workflow_tags',
                    value: [],
                  },
                  {
                    field: 'kibana.alert.workflow_assignee_ids',
                    value: [],
                  },
                ],
                ecs: {
                  _id: 'alert0',
                  _index: 'idx0',
                },
              },
              {
                _id: 'alert1',
                _index: 'idx1',
                data: [
                  {
                    field: 'kibana.alert.rule.name',
                    value: ['three'],
                  },
                  {
                    field: 'kibana.alert.rule.uuid',
                    value: ['uuidtwo'],
                  },
                  {
                    field: 'kibana.alert.case_ids',
                    value: [],
                  },
                  {
                    field: 'kibana.alert.workflow_tags',
                    value: [],
                  },
                  {
                    field: 'kibana.alert.workflow_assignee_ids',
                    value: [],
                  },
                ],
                ecs: {
                  _id: 'alert1',
                  _index: 'idx1',
                },
              },
            ]);
            expect(mockedFn.mock.calls[0][1]).toEqual(true);
            expect(mockedFn.mock.calls[0][2]).toBeDefined();
          });

          it('should first set all to loading, then clears the selection', async () => {
            const props = {
              ...tablePropsWithBulkActions,

              initialBulkActionsState: {
                ...defaultBulkActionsState,
                areAllVisibleRowsSelected: true,
                rowSelection: new Map(),
              },
            };
            render(<AlertsTableWithBulkActionsContext {...props} />);

            let bulkActionsCells = screen.getAllByTestId(
              'bulk-actions-row-cell'
            ) as HTMLInputElement[];

            fireEvent.click(screen.getByTestId('bulk-actions-header'));

            await waitFor(async () => {
              bulkActionsCells = screen.getAllByTestId(
                'bulk-actions-row-cell'
              ) as HTMLInputElement[];
              expect(bulkActionsCells[0].checked).toBeTruthy();
              expect(bulkActionsCells[1].checked).toBeTruthy();
              expect(screen.getByTestId('selectedShowBulkActionsButton')).toBeDefined();
            });

            fireEvent.click(screen.getByTestId('selectedShowBulkActionsButton'));
            await waitForEuiPopoverOpen();

            fireEvent.click(screen.getByTestId('fake-bulk-action-loading'));

            await waitFor(() => {
              expect(screen.queryAllByTestId('row-loader')).toHaveLength(2);
            });
          });

          it('should call refresh function of use fetch alerts when bulk action 3 is clicked', async () => {
            const props = {
              ...tablePropsWithBulkActions,
              initialBulkActionsState: {
                ...defaultBulkActionsState,
                areAllVisibleRowsSelected: false,
                rowSelection: new Map(),
              },
            };
            render(<AlertsTableWithBulkActionsContext {...props} />);

            let bulkActionsCells = screen.getAllByTestId(
              'bulk-actions-row-cell'
            ) as HTMLInputElement[];

            fireEvent.click(screen.getByTestId('bulk-actions-header'));

            await waitFor(async () => {
              bulkActionsCells = screen.getAllByTestId(
                'bulk-actions-row-cell'
              ) as HTMLInputElement[];
              expect(bulkActionsCells[0].checked).toBeTruthy();
              expect(bulkActionsCells[1].checked).toBeTruthy();
              expect(screen.getByTestId('selectedShowBulkActionsButton')).toBeDefined();
            });

            fireEvent.click(screen.getByTestId('selectedShowBulkActionsButton'));
            await waitForEuiPopoverOpen();

            refreshMockFn.mockClear();
            expect(refreshMockFn.mock.calls.length).toBe(0);
            fireEvent.click(screen.getByTestId('fake-bulk-action-refresh'));
            expect(refreshMockFn.mock.calls.length).toBeGreaterThan(0);
          });

          it('should clear all selection on bulk action click', async () => {
            const props = {
              ...tablePropsWithBulkActions,

              initialBulkActionsState: {
                ...defaultBulkActionsState,
                areAllVisibleRowsSelected: true,
                rowSelection: new Map([[0, { isLoading: true }]]),
              },
            };
            render(<AlertsTableWithBulkActionsContext {...props} />);

            let bulkActionsCells = screen.getAllByTestId(
              'bulk-actions-row-cell'
            ) as HTMLInputElement[];

            fireEvent.click(screen.getByTestId('bulk-actions-header'));

            expect(screen.getByTestId('selectedShowBulkActionsButton')).toBeVisible();

            fireEvent.click(screen.getByTestId('selectedShowBulkActionsButton'));
            await waitForEuiPopoverOpen();

            fireEvent.click(screen.getByTestId('fake-bulk-action-clear'));

            // clear Selection happens after 150ms
            await waitFor(() => {
              bulkActionsCells = screen.getAllByTestId(
                'bulk-actions-row-cell'
              ) as HTMLInputElement[];
              expect(bulkActionsCells[0].checked).toBeFalsy();
              expect(bulkActionsCells[1].checked).toBeFalsy();
            });
          });
        });
      });
    });
  });
});

import { CellActionsProvider } from '@kbn/cell-actions';
import { I18nProvider } from '@kbn/i18n-react';
import { CellValueElementProps } from '@kbn/timelines-plugin/common';
import { FieldBrowserProps } from '@kbn/triggers-actions-ui-plugin/public';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { DragDropContext, DropResult, ResponderProvided } from 'react-beautiful-dnd';
import { ThemeProvider } from 'styled-components';
import { DataTableComponent } from './index';
import { Provider as ReduxStoreProvider } from 'react-redux';
import { euiDarkVars } from '@kbn/ui-theme';
import { mockGlobalState } from '@kbn/securitysolution-data-table/mock/global_state';
import { Store } from 'redux';
import { createStore as createReduxStore } from 'redux';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { getMappedNonEcsValue } from './utils';
import { TableId } from '@kbn/securitysolution-data-table';

export default {
  component: DataTableComponent,
  title: 'DataTableComponent',
};

const createStore = (state: any) => createReduxStore(() => state, state);

interface Props {
  children?: React.ReactNode;
  store?: Store;
  onDragEnd?: (result: DropResult, provided: ResponderProvided) => void;
  cellActions?: Action[];
}

const StoryCellRenderer: React.FC<CellValueElementProps> = ({ columnId, data }) => (
  <>
    {getMappedNonEcsValue({
      data,
      fieldName: columnId,
    })?.reduce((x) => x[0]) ?? ''}
  </>
);

const StoryProviders: React.FC<Props> = ({ children, onDragEnd = () => {}, cellActions = [] }) => {
  const store = createStore(mockGlobalState);
  const queryClient = new QueryClient();

  console.log(store.getState());

  return (
    <I18nProvider>
      <ReduxStoreProvider store={store}>
        <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
          <QueryClientProvider client={queryClient}>
            <CellActionsProvider getTriggerCompatibleActions={() => Promise.resolve(cellActions)}>
              <DragDropContext onDragEnd={onDragEnd}>{children}</DragDropContext>
            </CellActionsProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </ReduxStoreProvider>
    </I18nProvider>
  );
};

export function Example() {
  return (
    <StoryProviders>
      <DataTableComponent
        browserFields={{}}
        data={[]}
        id={TableId.test}
        renderCellValue={StoryCellRenderer}
        leadingControlColumns={[]}
        loadPage={function (newActivePage: number): void {
          throw new Error('Function not implemented.');
        }}
        rowRenderers={[]}
        unitCountText={''}
        pagination={{} as any}
        totalItems={0}
        getFieldBrowser={(props: FieldBrowserProps) => {
          return null;
        }}
      />
    </StoryProviders>
  );
}

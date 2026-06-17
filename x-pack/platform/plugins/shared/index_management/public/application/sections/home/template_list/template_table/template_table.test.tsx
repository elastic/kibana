/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ScopedHistory } from '@kbn/core/public';
import type { TemplateListItem } from '../../../../../../common';
import { TemplateTable } from './template_table';

let mockSelectedNames = new Set<string>();

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');

  const renderColumnCell = (column: any, item: any) => {
    if (column.actions) {
      return (
        <div data-test-subj={`actions-${item.name}`}>
          {column.actions.map((action: any) => (
            <button
              key={action.name}
              type="button"
              data-test-subj={`action-${item.name}-${action.name}`}
              disabled={action.enabled ? !action.enabled(item) : false}
              onClick={() => action.onClick(item)}
            >
              {action.name}
            </button>
          ))}
        </div>
      );
    }
    if (column.render) {
      if (column.field !== undefined) {
        return column.render(item[column.field], item);
      }
      return column.render(item);
    }
    if (column.field) {
      return String(item[column.field]);
    }
    return null;
  };

  const EuiInMemoryTable = ({
    items,
    columns,
    search,
    selection,
    'data-test-subj': dataTestSubj,
  }: any) => {
    const toggleSelect = (item: any) => {
      if (mockSelectedNames.has(item.name)) {
        mockSelectedNames.delete(item.name);
      } else {
        mockSelectedNames.add(item.name);
      }

      const selectedItems = items.filter((i: any) => mockSelectedNames.has(i.name));
      selection?.onSelectionChange?.(selectedItems);
    };

    return (
      <div data-test-subj={dataTestSubj}>
        <div data-test-subj="toolsLeft">{search?.toolsLeft}</div>
        <div data-test-subj="toolsRight">
          {search?.toolsRight?.map((node: any, i: number) => (
            <span key={i}>{node}</span>
          ))}
        </div>
        <div data-test-subj="rows">
          {items.map((item: any) => (
            <div key={item.name} data-test-subj={`row-${item.name}`}>
              {selection ? (
                <button
                  type="button"
                  data-test-subj={`toggleSelect-${item.name}`}
                  onClick={() => toggleSelect(item)}
                >
                  toggleSelect
                </button>
              ) : null}
              {columns.map((column: any, colIndex: number) => (
                <div
                  key={column.field ?? column.name ?? `col-${colIndex}`}
                  data-test-subj={`cell-${item.name}-${String(column.field ?? colIndex)}`}
                >
                  {renderColumnCell(column, item)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return {
    ...actual,
    EuiInMemoryTable,
    EuiButton: ({ children, iconType: _icon, fill: _fill, ...props }: any) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
    EuiLink: ({ children, ...props }: any) => <a {...props}>{children}</a>,
    EuiIcon: ({ type }: any) => <span data-test-subj={`euiIcon-${type}`} />,
  };
});

jest.mock('@kbn/shared-ux-table-persist', () => ({
  useEuiTablePersist: () => ({
    pageSize: 20,
    sorting: {},
    onTableChange: jest.fn(),
  }),
}));

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => (
    <span>{defaultMessage}</span>
  ),
}));

jest.mock('../../../../app_context', () => ({
  useServices: jest.fn(),
  useAppContext: jest.fn(),
}));

import { useAppContext, useServices } from '../../../../app_context';

jest.mock('../../../../../shared_imports', () => ({
  reactRouterNavigate: (_history: unknown, _path: unknown, onNavigateCallback?: () => void) => ({
    href: '#',
    onClick: () => {
      onNavigateCallback?.();
    },
  }),
}));

jest.mock('../../../../components', () => ({
  TemplateDeleteModal: () => <div data-test-subj="templateDeleteModal" />,
}));

jest.mock('../../../../components/shared', () => ({
  TemplateContentIndicator: () => <span data-test-subj="templateContentIndicator" />,
}));

jest.mock('../components', () => ({
  TemplateTypeIndicator: ({ templateType }: { templateType: string }) => (
    <span data-test-subj={`templateType-${templateType}`} />
  ),
  TemplateDeprecatedBadge: () => <span data-test-subj="templateDeprecatedBadge" />,
}));

const createTemplate = (overrides: Partial<TemplateListItem> = {}): TemplateListItem => {
  const base: TemplateListItem = {
    name: 'my-template',
    indexPatterns: ['logs-*'],
    hasSettings: true,
    hasMappings: false,
    hasAliases: false,
    composedOf: [],
    _kbnMeta: {
      type: 'default',
      hasDatastream: false,
    },
  };
  return {
    ...base,
    ...overrides,
    _kbnMeta: {
      ...base._kbnMeta,
      ...(overrides._kbnMeta ?? {}),
    },
  };
};

const createHistory = (): ScopedHistory =>
  ({ push: jest.fn(), location: {} } as unknown as ScopedHistory);

describe('TemplateTable', () => {
  const mockTrackMetric = jest.fn();
  const mockedUseAppContext = useAppContext as jest.MockedFunction<typeof useAppContext>;
  const mockedUseServices = useServices as jest.MockedFunction<typeof useServices>;

  beforeEach(() => {
    mockSelectedNames = new Set<string>();
    mockTrackMetric.mockClear();
    mockedUseServices.mockReturnValue({
      uiMetricService: { trackMetric: mockTrackMetric },
    } as unknown as ReturnType<typeof useServices>);
    mockedUseAppContext.mockReturnValue({
      privs: {
        manageIndexTemplates: true,
        monitor: true,
        manageEnrich: true,
        monitorEnrich: true,
      },
    } as ReturnType<typeof useAppContext>);
  });

  it('renders template rows with name link and index patterns', () => {
    const template = createTemplate({ name: 't1', indexPatterns: ['a-*', 'b-*'] });

    render(
      <TemplateTable
        templates={[template]}
        reload={jest.fn()}
        editTemplate={jest.fn()}
        cloneTemplate={jest.fn()}
        history={createHistory()}
      />
    );

    expect(screen.getByTestId('templateTable')).toBeInTheDocument();
    expect(screen.getByTestId('templateDetailsLink')).toHaveTextContent('t1');
    expect(screen.getByTestId('cell-t1-indexPatterns')).toHaveTextContent('a-*, b-*');
  });

  it('tracks a metric when the template details link is clicked', () => {
    const template = createTemplate({ name: 't1' });

    render(
      <TemplateTable
        templates={[template]}
        reload={jest.fn()}
        editTemplate={jest.fn()}
        cloneTemplate={jest.fn()}
        history={createHistory()}
      />
    );

    fireEvent.click(screen.getByTestId('templateDetailsLink'));
    expect(mockTrackMetric).toHaveBeenCalled();
  });

  it('renders composed count as plain text when there are no component templates', () => {
    const template = createTemplate({ name: 't1', composedOf: [] });

    render(
      <TemplateTable
        templates={[template]}
        reload={jest.fn()}
        editTemplate={jest.fn()}
        cloneTemplate={jest.fn()}
        history={createHistory()}
      />
    );

    expect(screen.queryByTestId('componentTemplatesLink')).not.toBeInTheDocument();
    expect(screen.getByTestId('cell-t1-composedOf')).toHaveTextContent('0');
  });

  it('renders a component templates link when composedOf is non-empty', () => {
    const template = createTemplate({ name: 't1', composedOf: ['ct-a', 'ct-b'] });

    render(
      <TemplateTable
        templates={[template]}
        reload={jest.fn()}
        editTemplate={jest.fn()}
        cloneTemplate={jest.fn()}
        history={createHistory()}
      />
    );

    expect(screen.getByTestId('componentTemplatesLink')).toHaveTextContent('2');
  });

  it('shows the data stream check icon when the template has a data stream', () => {
    const template = createTemplate({
      name: 't1',
      _kbnMeta: { type: 'default', hasDatastream: true },
    });

    render(
      <TemplateTable
        templates={[template]}
        reload={jest.fn()}
        editTemplate={jest.fn()}
        cloneTemplate={jest.fn()}
        history={createHistory()}
      />
    );

    expect(screen.getByTestId('euiIcon-check')).toBeInTheDocument();
  });

  it('calls editTemplate when Edit is clicked', () => {
    const editTemplate = jest.fn();
    const template = createTemplate({ name: 't1' });

    render(
      <TemplateTable
        templates={[template]}
        reload={jest.fn()}
        editTemplate={editTemplate}
        cloneTemplate={jest.fn()}
        history={createHistory()}
      />
    );

    fireEvent.click(screen.getByTestId('action-t1-Edit'));
    expect(editTemplate).toHaveBeenCalledWith('t1');
  });

  it('calls cloneTemplate when Clone is clicked', () => {
    const cloneTemplate = jest.fn();
    const template = createTemplate({ name: 't1' });

    render(
      <TemplateTable
        templates={[template]}
        reload={jest.fn()}
        editTemplate={jest.fn()}
        cloneTemplate={cloneTemplate}
        history={createHistory()}
      />
    );

    fireEvent.click(screen.getByTestId('action-t1-Clone'));
    expect(cloneTemplate).toHaveBeenCalledWith('t1');
  });

  it('opens the delete modal when Delete is clicked', () => {
    const template = createTemplate({ name: 't1' });

    render(
      <TemplateTable
        templates={[template]}
        reload={jest.fn()}
        editTemplate={jest.fn()}
        cloneTemplate={jest.fn()}
        history={createHistory()}
      />
    );

    expect(screen.queryByTestId('templateDeleteModal')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('action-t1-Delete'));
    expect(screen.getByTestId('templateDeleteModal')).toBeInTheDocument();
  });

  it('shows bulk delete after selecting rows', () => {
    const t1 = createTemplate({ name: 't1' });
    const t2 = createTemplate({ name: 't2' });

    render(
      <TemplateTable
        templates={[t1, t2]}
        reload={jest.fn()}
        editTemplate={jest.fn()}
        cloneTemplate={jest.fn()}
        history={createHistory()}
      />
    );

    expect(screen.queryByTestId('deleteTemplatesButton')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('toggleSelect-t1'));
    expect(screen.getByTestId('deleteTemplatesButton')).toBeInTheDocument();
  });

  it('shows the create template button when the user can manage index templates', () => {
    render(
      <TemplateTable
        templates={[createTemplate()]}
        reload={jest.fn()}
        editTemplate={jest.fn()}
        cloneTemplate={jest.fn()}
        history={createHistory()}
      />
    );

    expect(screen.getByTestId('createTemplateButton')).toBeInTheDocument();
  });

  it('hides management controls when manageIndexTemplates is false', () => {
    mockedUseAppContext.mockReturnValue({
      privs: {
        manageIndexTemplates: false,
        monitor: true,
        manageEnrich: true,
        monitorEnrich: true,
      },
    } as ReturnType<typeof useAppContext>);

    render(
      <TemplateTable
        templates={[createTemplate({ name: 't1' })]}
        reload={jest.fn()}
        editTemplate={jest.fn()}
        cloneTemplate={jest.fn()}
        history={createHistory()}
      />
    );

    expect(screen.queryByTestId('createTemplateButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('toggleSelect-t1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('actions-t1')).not.toBeInTheDocument();
  });

  it('disables Edit and Delete for cloud-managed templates', () => {
    const template = createTemplate({
      name: 'cloud-t',
      _kbnMeta: { type: 'cloudManaged', hasDatastream: false },
    });

    render(
      <TemplateTable
        templates={[template]}
        reload={jest.fn()}
        editTemplate={jest.fn()}
        cloneTemplate={jest.fn()}
        history={createHistory()}
      />
    );

    expect(screen.getByTestId('action-cloud-t-Edit')).toBeDisabled();
    expect(screen.getByTestId('action-cloud-t-Delete')).toBeDisabled();
    expect(screen.getByTestId('action-cloud-t-Clone')).not.toBeDisabled();
  });
});

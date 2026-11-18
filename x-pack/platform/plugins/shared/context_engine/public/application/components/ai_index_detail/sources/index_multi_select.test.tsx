/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatchedItem } from '@kbn/data-views-plugin/public';
import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { useCallback, useMemo, useState } from 'react';
import { IndexMultiSelect } from './index_multi_select';

const INDEX_SEARCH_DEBOUNCE_MS = 300;

const buildMatchedItem = (name: string): MatchedItem => ({
  name,
  tags: [],
  item: { name },
});

const INDEX_MATCHES = [
  buildMatchedItem('logs-*'),
  buildMatchedItem('metrics-*'),
  buildMatchedItem('.ds-traces-default'),
];

const resolveIndicesForSearchTests = (pattern: string): MatchedItem[] => {
  if (pattern === '*metrics-only*') {
    return [buildMatchedItem('metrics-*')];
  }
  if (pattern === '*nginx*,-.*') {
    return [buildMatchedItem('logs-nginx'), buildMatchedItem('logs-*')];
  }
  if (pattern === '*metrics*,-.*') {
    return [buildMatchedItem('metrics-*'), buildMatchedItem('logs-nginx')];
  }
  if (pattern === '*nomatch*,-.*') {
    return [];
  }
  if (pattern === '*,-.*') {
    return INDEX_MATCHES;
  }
  return [];
};

const createServices = ({
  indices = INDEX_MATCHES,
  resolveIndices,
}: {
  indices?: MatchedItem[];
  resolveIndices?: (pattern: string) => MatchedItem[] | Promise<MatchedItem[]>;
} = {}) => {
  const services = coreMock.createStart();
  const data = dataPluginMock.createStartContract();
  if (resolveIndices) {
    data.dataViews.getIndices = jest.fn(({ pattern }: { pattern: string }) =>
      Promise.resolve(resolveIndices(pattern))
    );
  } else {
    data.dataViews.getIndices = jest.fn().mockResolvedValue(indices);
  }
  return { ...services, data };
};

interface HarnessProps {
  disabled?: boolean;
  initialPending?: string[];
  initialSaved?: string[];
}

const Harness = ({ disabled, initialPending = [], initialSaved = [] }: HarnessProps) => {
  const [pending, setPending] = useState(initialPending);
  const savedNames = useMemo(() => new Set(initialSaved), [initialSaved]);

  const isIndexSaved = useCallback((indexName: string) => savedNames.has(indexName), [savedNames]);
  const onToggle = useCallback((indexName: string, checked: boolean) => {
    setPending((prev) => {
      if (checked) {
        return prev.includes(indexName) ? prev : [...prev, indexName];
      }
      return prev.filter((name) => name !== indexName);
    });
  }, []);

  return (
    <IndexMultiSelect
      isIndexSaved={isIndexSaved}
      pendingIndexNames={pending}
      onToggle={onToggle}
      disabled={disabled}
    />
  );
};

const renderWithProviders = (ui: React.ReactElement, services = createServices()) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    services,
    ...render(
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={services}>
            <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    ),
  };
};

const getVisibleIndexOptionNames = (): string[] =>
  Array.from(document.querySelectorAll('[data-test-subj^="contextIndexOption-"]')).map((node) => {
    const testSubj = node.getAttribute('data-test-subj');
    return testSubj ? testSubj.slice('contextIndexOption-'.length) : '';
  });

const clickIndexOption = async (indexName: string) => {
  fireEvent.click(await screen.findByTestId(`contextIndexOption-${indexName}`));
};

const typeIndexSearch = async (value: string) => {
  fireEvent.change(screen.getByTestId('contextIndexSearch'), { target: { value } });
  jest.advanceTimersByTime(INDEX_SEARCH_DEBOUNCE_MS);
  await waitFor(() => expect(screen.getByTestId('contextIndexSelectable')).toBeInTheDocument());
};

describe('IndexMultiSelect', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('lists indices on mount', async () => {
    const { services } = renderWithProviders(<Harness />);

    await screen.findByTestId('contextIndexOption-logs-*');
    expect(screen.getByTestId('contextIndexOption-metrics-*')).toBeInTheDocument();
    expect(services.data.dataViews.getIndices).toHaveBeenCalled();
  });

  it('hides saved indices from the list', async () => {
    renderWithProviders(<Harness initialSaved={['logs-*']} />);

    await screen.findByTestId('contextIndexOption-metrics-*');
    expect(screen.queryByTestId('contextIndexOption-logs-*')).not.toBeInTheDocument();
  });

  it('calls onToggle with checked true when an unchecked index is clicked', async () => {
    const onToggle = jest.fn();
    const services = createServices();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={services}>
            <QueryClientProvider client={queryClient}>
              <IndexMultiSelect
                isIndexSaved={() => false}
                pendingIndexNames={[]}
                onToggle={onToggle}
              />
            </QueryClientProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    );

    await clickIndexOption('logs-*');
    expect(onToggle).toHaveBeenCalledWith('logs-*', true);
  });

  it('renders pending indices checked without reordering the list', async () => {
    renderWithProviders(<Harness initialPending={['metrics-*']} />);

    await screen.findByTestId('contextIndexOption-logs-*');
    expect(getVisibleIndexOptionNames().slice(0, 2)).toEqual(['logs-*', 'metrics-*']);
    expect(screen.getByTestId('contextIndexOption-metrics-*')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  it('calls onToggle with checked false when a pending index is clicked', async () => {
    const onToggle = jest.fn();
    const services = createServices();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={services}>
            <QueryClientProvider client={queryClient}>
              <IndexMultiSelect
                isIndexSaved={() => false}
                pendingIndexNames={['logs-*']}
                onToggle={onToggle}
              />
            </QueryClientProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    );

    await clickIndexOption('logs-*');
    expect(onToggle).toHaveBeenCalledWith('logs-*', false);
  });

  it('does not show pending indices that search results omit', async () => {
    renderWithProviders(
      <Harness initialPending={['logs-nginx']} />,
      createServices({ resolveIndices: resolveIndicesForSearchTests })
    );

    await screen.findByTestId('contextIndexOption-logs-*');
    await typeIndexSearch('metrics-only');

    await waitFor(() => {
      expect(screen.queryByTestId('contextIndexOption-logs-*')).not.toBeInTheDocument();
    });
    expect(screen.queryByTestId('contextIndexOption-logs-nginx')).not.toBeInTheDocument();
  });

  it('hides saved indices from search results', async () => {
    renderWithProviders(
      <Harness initialSaved={['logs-nginx']} />,
      createServices({ resolveIndices: resolveIndicesForSearchTests })
    );

    await screen.findByTestId('contextIndexOption-logs-*');
    await typeIndexSearch('nginx');

    await waitFor(() => {
      expect(screen.getByTestId('contextIndexOption-logs-*')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('contextIndexOption-logs-nginx')).not.toBeInTheDocument();
  });

  it('shows the loading spinner only while the first index list loads', async () => {
    let resolveIndices!: (value: MatchedItem[]) => void;
    const services = createServices();
    services.data.dataViews.getIndices = jest.fn(
      () =>
        new Promise<MatchedItem[]>((resolve) => {
          resolveIndices = resolve;
        })
    );
    renderWithProviders(<Harness />, services);

    expect(await screen.findAllByText('Loading options')).not.toHaveLength(0);
    expect(screen.getByTestId('contextIndexSelectableLoadingBar')).toHaveStyle({
      visibility: 'hidden',
    });

    resolveIndices(INDEX_MATCHES);

    expect(await screen.findByTestId('contextIndexOption-logs-*')).toBeInTheDocument();
    expect(screen.queryAllByText('Loading options')).toHaveLength(0);
  });

  it('keeps the previous index list under a loading bar while a search is pending', async () => {
    renderWithProviders(
      <Harness />,
      createServices({ resolveIndices: resolveIndicesForSearchTests })
    );

    await screen.findByTestId('contextIndexOption-logs-*');
    expect(screen.getByTestId('contextIndexSelectableLoadingBar')).toHaveStyle({
      visibility: 'hidden',
    });

    fireEvent.change(screen.getByTestId('contextIndexSearch'), { target: { value: 'nginx' } });

    expect(screen.getByTestId('contextIndexOption-logs-*')).toBeInTheDocument();
    expect(screen.queryAllByText('Loading options')).toHaveLength(0);
    expect(screen.getByTestId('contextIndexSelectableLoadingBar')).toHaveStyle({
      visibility: 'visible',
    });

    jest.advanceTimersByTime(INDEX_SEARCH_DEBOUNCE_MS);

    expect(await screen.findByTestId('contextIndexOption-logs-nginx')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('contextIndexSelectableLoadingBar')).toHaveStyle({
        visibility: 'hidden',
      })
    );
  });

  it('does not flash the empty list message when clearing a search without matches', async () => {
    renderWithProviders(
      <Harness />,
      createServices({ resolveIndices: resolveIndicesForSearchTests })
    );

    await screen.findByTestId('contextIndexOption-logs-*');
    await typeIndexSearch('nomatch');
    expect(await screen.findAllByText('No matches for this search.')).not.toHaveLength(0);

    fireEvent.change(screen.getByTestId('contextIndexSearch'), { target: { value: '' } });

    expect(screen.queryAllByText('No matches for this search.')).not.toHaveLength(0);
    expect(screen.queryAllByText('No indices, data streams or aliases found.')).toHaveLength(0);

    jest.advanceTimersByTime(INDEX_SEARCH_DEBOUNCE_MS);

    expect(await screen.findByTestId('contextIndexOption-logs-*')).toBeInTheDocument();
  });

  it('shows the empty list message when there are no indices at all', async () => {
    renderWithProviders(<Harness />, createServices({ indices: [] }));

    expect(
      await screen.findAllByText('No indices, data streams or aliases found.')
    ).not.toHaveLength(0);
  });

  it('blocks selection when disabled', async () => {
    const onToggle = jest.fn();
    const services = createServices();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={services}>
            <QueryClientProvider client={queryClient}>
              <IndexMultiSelect
                isIndexSaved={() => false}
                pendingIndexNames={[]}
                onToggle={onToggle}
                disabled
              />
            </QueryClientProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    );

    await screen.findByTestId('contextIndexOption-logs-*');
    expect(screen.getByTestId('contextIndexSearch')).toBeDisabled();
    fireEvent.click(screen.getByTestId('contextIndexOption-logs-*'));
    expect(onToggle).not.toHaveBeenCalled();
  });
});

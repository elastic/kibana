/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { render, screen, act } from '@testing-library/react';

import {
  ExportFiltersProvider,
  useExportFiltersContext,
  useExportFilters,
} from './export_filters_context';
import type { ExportFilters, ExportFiltersStore } from './export_filters_context';

// ─── Test helpers ──────────────────────────────────────────────────────────────

/** Subscribes to a single actionId and renders its latest filters. */
const ReaderConsumer: React.FC<{ actionId: string; onRender?: () => void }> = ({
  actionId,
  onRender,
}) => {
  const filters = useExportFilters(actionId);
  onRender?.();

  return (
    <div data-test-subj={`reader-${actionId}`}>{filters ? JSON.stringify(filters) : 'none'}</div>
  );
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('ExportFiltersContext', () => {
  describe('provider / store basics', () => {
    it('provides a store to children', () => {
      const TestChild = () => {
        const store = useExportFiltersContext();

        return <div data-test-subj="has-store">{store ? 'yes' : 'no'}</div>;
      };

      render(
        <ExportFiltersProvider>
          <TestChild />
        </ExportFiltersProvider>
      );

      expect(screen.getByTestId('has-store')).toHaveTextContent('yes');
    });

    it('returns null when used outside a provider', () => {
      const TestChild = () => {
        const store = useExportFiltersContext();

        return <div data-test-subj="has-store">{store ? 'yes' : 'no'}</div>;
      };

      render(<TestChild />);

      expect(screen.getByTestId('has-store')).toHaveTextContent('no');
    });
  });

  describe('setFilters / getFilters', () => {
    it('getFilters returns undefined before any write', () => {
      let store: ReturnType<typeof useExportFiltersContext> | undefined;

      const Capture = () => {
        store = useExportFiltersContext();

        return null;
      };

      render(
        <ExportFiltersProvider>
          <Capture />
        </ExportFiltersProvider>
      );

      expect(store?.getFilters('unknown-id')).toBeUndefined();
    });

    it('getFilters returns the value after a write', () => {
      let store: ReturnType<typeof useExportFiltersContext> | undefined;

      const Capture = () => {
        store = useExportFiltersContext();

        return null;
      };

      render(
        <ExportFiltersProvider>
          <Capture />
        </ExportFiltersProvider>
      );

      const filters: ExportFilters = { kuery: 'host.name:foo', filteredTotal: 5, total: 100 };
      act(() => {
        store?.setFilters('abc', filters);
      });

      expect(store?.getFilters('abc')).toEqual(filters);
    });
  });

  describe('useExportFilters subscriber hook', () => {
    it('returns "none" when no write has occurred', () => {
      render(
        <ExportFiltersProvider>
          <ReaderConsumer actionId="action-1" />
        </ExportFiltersProvider>
      );

      expect(screen.getByTestId('reader-action-1')).toHaveTextContent('none');
    });

    it('renders the written filters for the subscribed actionId after a write', () => {
      let store: ReturnType<typeof useExportFiltersContext> | undefined;

      const Capture = () => {
        store = useExportFiltersContext();

        return null;
      };

      render(
        <ExportFiltersProvider>
          <Capture />
          <ReaderConsumer actionId="action-2" />
        </ExportFiltersProvider>
      );

      act(() => {
        store?.setFilters('action-2', { kuery: 'agent.id:xyz', filteredTotal: 3, total: 42 });
      });

      const el = screen.getByTestId('reader-action-2');
      expect(el).toHaveTextContent('"kuery":"agent.id:xyz"');
      expect(el).toHaveTextContent('"filteredTotal":3');
    });

    it('does not re-render a subscriber when a different actionId is updated', () => {
      let store: ReturnType<typeof useExportFiltersContext> | undefined;
      const renderCount = { 'action-3': 0, 'action-4': 0 };

      const TrackReader: React.FC<{ actionId: 'action-3' | 'action-4' }> = ({ actionId }) => {
        const filters = useExportFilters(actionId);
        renderCount[actionId]++;

        return (
          <div data-test-subj={`reader-${actionId}`}>
            {filters ? JSON.stringify(filters) : 'none'}
          </div>
        );
      };

      const Capture = () => {
        store = useExportFiltersContext();

        return null;
      };

      render(
        <ExportFiltersProvider>
          <Capture />
          <TrackReader actionId="action-3" />
          <TrackReader actionId="action-4" />
        </ExportFiltersProvider>
      );

      const beforeAction3 = renderCount['action-3'];
      const beforeAction4 = renderCount['action-4'];

      act(() => {
        store?.setFilters('action-4', { filteredTotal: 7, total: 20 });
      });

      expect(renderCount['action-4']).toBeGreaterThan(beforeAction4);
      expect(renderCount['action-3']).toBe(beforeAction3);
    });

    it('does NOT re-render when the same filter value is written again (shallow equal)', () => {
      let store: ReturnType<typeof useExportFiltersContext> | undefined;
      let renderCount = 0;

      const TrackReader = () => {
        const filters = useExportFilters('stable-id');
        renderCount++;

        return <div data-test-subj="stable">{filters ? JSON.stringify(filters) : 'none'}</div>;
      };

      const Capture = () => {
        store = useExportFiltersContext();

        return null;
      };

      render(
        <ExportFiltersProvider>
          <Capture />
          <TrackReader />
        </ExportFiltersProvider>
      );

      const filters: ExportFilters = { kuery: 'foo', filteredTotal: 1, total: 10 };

      act(() => {
        store?.setFilters('stable-id', filters);
      });

      const afterFirst = renderCount;

      // Write same object shape again — shallow equal, so no re-render.
      act(() => {
        store?.setFilters('stable-id', { ...filters });
      });

      expect(renderCount).toBe(afterFirst);
    });

    it('returns undefined when actionId is undefined', () => {
      const TestChild = () => {
        const val = useExportFilters(undefined);

        return <div data-test-subj="undef-result">{val == null ? 'undefined' : 'defined'}</div>;
      };

      render(
        <ExportFiltersProvider>
          <TestChild />
        </ExportFiltersProvider>
      );

      expect(screen.getByTestId('undef-result')).toHaveTextContent('undefined');
    });
  });

  describe('writing filters does not re-render the provider', () => {
    it('provider render count stays constant after writes', () => {
      let providerRenderCount = 0;

      const CountingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        providerRenderCount++;

        return <ExportFiltersProvider>{children}</ExportFiltersProvider>;
      };

      let store: ReturnType<typeof useExportFiltersContext> | undefined;

      const Capture = () => {
        store = useExportFiltersContext();

        return null;
      };

      render(
        <CountingProvider>
          <Capture />
        </CountingProvider>
      );

      const before = providerRenderCount;

      act(() => {
        store?.setFilters('no-render-id', { filteredTotal: 99 });
      });

      expect(providerRenderCount).toBe(before);
    });
  });

  describe('setFilters reference stability', () => {
    it('setFilters reference is the same across re-renders', () => {
      type SetFiltersFn = ExportFiltersStore['setFilters'] | undefined;
      const refs: Array<SetFiltersFn> = [];

      const Capture = () => {
        const store = useExportFiltersContext();
        refs.push(store?.setFilters);

        return null;
      };

      const { rerender } = render(
        <ExportFiltersProvider>
          <Capture />
        </ExportFiltersProvider>
      );

      rerender(
        <ExportFiltersProvider>
          <Capture />
        </ExportFiltersProvider>
      );

      expect(refs.length).toBeGreaterThanOrEqual(2);
      expect(refs[0]).toBe(refs[refs.length - 1]);
    });
  });

  describe('clearFilters', () => {
    it('drops the entry from the store', () => {
      let store: ReturnType<typeof useExportFiltersContext> | undefined;

      const Capture = () => {
        store = useExportFiltersContext();

        return null;
      };

      render(
        <ExportFiltersProvider>
          <Capture />
        </ExportFiltersProvider>
      );

      act(() => {
        store?.setFilters('to-clear', { filteredTotal: 5, total: 50 });
      });

      expect(store?.getFilters('to-clear')).toEqual({ filteredTotal: 5, total: 50 });

      act(() => {
        store?.clearFilters('to-clear');
      });

      expect(store?.getFilters('to-clear')).toBeUndefined();
    });

    it('notifies subscribers when an entry is cleared so they re-read undefined', () => {
      let store: ReturnType<typeof useExportFiltersContext> | undefined;

      const Capture = () => {
        store = useExportFiltersContext();

        return null;
      };

      render(
        <ExportFiltersProvider>
          <Capture />
          <ReaderConsumer actionId="clear-notify" />
        </ExportFiltersProvider>
      );

      act(() => {
        store?.setFilters('clear-notify', { kuery: 'host.name:a', filteredTotal: 1, total: 10 });
      });

      expect(screen.getByTestId('reader-clear-notify')).toHaveTextContent('host.name:a');

      act(() => {
        store?.clearFilters('clear-notify');
      });

      expect(screen.getByTestId('reader-clear-notify')).toHaveTextContent('none');
    });

    it('is a no-op when the entry does not exist', () => {
      let store: ReturnType<typeof useExportFiltersContext> | undefined;
      let renderCount = 0;

      const Capture = () => {
        store = useExportFiltersContext();

        return null;
      };

      const TrackReader = () => {
        useExportFilters('untouched');
        renderCount++;

        return null;
      };

      render(
        <ExportFiltersProvider>
          <Capture />
          <TrackReader />
        </ExportFiltersProvider>
      );

      const before = renderCount;

      act(() => {
        store?.clearFilters('untouched');
      });

      expect(renderCount).toBe(before);
    });
  });

  describe('subscriber cleanup on unmount', () => {
    it('removes the subscription when the consumer unmounts (no stale listeners)', () => {
      let store: ReturnType<typeof useExportFiltersContext> | undefined;
      let renderCount = 0;

      const Capture = () => {
        store = useExportFiltersContext();

        return null;
      };

      const TrackReader = () => {
        useExportFilters('unmount-id');
        renderCount++;

        return null;
      };

      const { unmount: unmountReader } = render(
        <ExportFiltersProvider>
          <Capture />
          <TrackReader />
        </ExportFiltersProvider>
      );

      unmountReader();

      const countAfterUnmount = renderCount;

      // Writing after unmount should not trigger any subscriber re-render
      act(() => {
        store?.setFilters('unmount-id', { filteredTotal: 1 });
      });

      expect(renderCount).toBe(countAfterUnmount);
    });
  });

  describe('multiple subscribers to the same actionId', () => {
    it('notifies all subscribers when the shared actionId is updated', () => {
      let store: ReturnType<typeof useExportFiltersContext> | undefined;
      const renderCounts = { a: 0, b: 0 };

      const Capture = () => {
        store = useExportFiltersContext();

        return null;
      };

      const ReaderA = () => {
        useExportFilters('shared-multi');
        renderCounts.a++;

        return null;
      };

      const ReaderB = () => {
        useExportFilters('shared-multi');
        renderCounts.b++;

        return null;
      };

      render(
        <ExportFiltersProvider>
          <Capture />
          <ReaderA />
          <ReaderB />
        </ExportFiltersProvider>
      );

      const beforeA = renderCounts.a;
      const beforeB = renderCounts.b;

      act(() => {
        store?.setFilters('shared-multi', { filteredTotal: 42, total: 100 });
      });

      expect(renderCounts.a).toBeGreaterThan(beforeA);
      expect(renderCounts.b).toBeGreaterThan(beforeB);
    });
  });

  describe('integration: writer and reader in the same tree', () => {
    it('reader reflects value written synchronously by writer component', () => {
      const filters: ExportFilters = {
        kuery: 'process.name:bash',
        filteredTotal: 50,
        total: 200,
      };

      const Writer = () => {
        const store = useExportFiltersContext();
        const write = useCallback(() => {
          store?.setFilters('shared-action', filters);
        }, [store]);
        write();

        return null;
      };

      render(
        <ExportFiltersProvider>
          <Writer />
          <ReaderConsumer actionId="shared-action" />
        </ExportFiltersProvider>
      );

      const el = screen.getByTestId('reader-shared-action');
      expect(el).toHaveTextContent('"kuery":"process.name:bash"');
      expect(el).toHaveTextContent('"filteredTotal":50');
    });
  });
});

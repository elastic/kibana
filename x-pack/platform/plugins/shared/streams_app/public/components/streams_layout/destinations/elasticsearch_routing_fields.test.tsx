/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ElasticsearchRoutingFields } from './elasticsearch_routing_fields';
import {
  EMPTY_ELASTICSEARCH_DESTINATION_FORM,
  type ElasticsearchDestinationFormData,
} from './types';

type RoutingErrors = Pick<
  React.ComponentProps<typeof ElasticsearchRoutingFields>,
  'staticIndexesError' | 'logsIndexError' | 'metricsIndexError' | 'tracesIndexError'
>;

const renderRouting = ({
  variant,
  initial = {},
  errors = {},
}: {
  variant: 'local' | 'remote';
  initial?: Partial<ElasticsearchDestinationFormData>;
  errors?: RoutingErrors;
}) => {
  const onAutoChange = jest.fn();
  const onIndexesChange = jest.fn();
  const onBlur = jest.fn();

  const Harness = () => {
    const [form, setForm] = useState<ElasticsearchDestinationFormData>({
      ...EMPTY_ELASTICSEARCH_DESTINATION_FORM,
      ...initial,
    });
    return (
      <ElasticsearchRoutingFields
        variant={variant}
        auto={form.auto}
        logsIndex={form.logsIndex}
        metricsIndex={form.metricsIndex}
        tracesIndex={form.tracesIndex}
        {...errors}
        disabled={false}
        onAutoChange={(auto) => {
          onAutoChange(auto);
          setForm((previous) => ({ ...previous, auto }));
        }}
        onIndexesChange={(indexes) => {
          onIndexesChange(indexes);
          setForm((previous) => ({ ...previous, ...indexes }));
        }}
        onBlur={onBlur}
      />
    );
  };

  const result = render(<Harness />);
  return { ...result, onAutoChange, onIndexesChange, onBlur };
};

const selectFixed = () => userEvent.click(screen.getByLabelText('Fixed index per signal'));
const selectAuto = () => userEvent.click(screen.getByLabelText('Auto'));
const selectScope = (scope: 'all' | 'logs' | 'metrics' | 'traces') =>
  userEvent.click(screen.getByTestId(`streamsCreateDestinationIndexScope-${scope}`));
const allScopeButton = () => screen.getByTestId('streamsCreateDestinationIndexScope-all');

describe('ElasticsearchRoutingFields', () => {
  describe('remote variant', () => {
    it('has no write targets switch and no signal prefix', async () => {
      const { onIndexesChange } = renderRouting({ variant: 'remote' });

      expect(screen.queryByTestId('streamsCreateDestinationSetWriteTargets')).toBeNull();
      expect(screen.queryByTestId('streamsCreateDestinationIndex')).toBeNull();

      await selectFixed();
      expect(screen.queryByText('logs / metrics / traces')).toBeNull();
      expect(screen.getByTestId('streamsCreateDestinationIndex')).toHaveAttribute(
        'placeholder',
        'my-index'
      );

      await selectScope('logs');
      expect(screen.queryByText('logs-')).toBeNull();

      await userEvent.type(screen.getByTestId('streamsCreateDestinationLogsIndex'), 'my-index');
      expect(onIndexesChange).toHaveBeenLastCalledWith({ logsIndex: 'my-index' });
      expect(screen.getByTestId('streamsCreateDestinationLogsIndex')).toHaveValue('my-index');
    });

    it.each(['shared-idx', 'logs-a-b'])(
      'All writes the raw name %s to every signal',
      async (name) => {
        const { onIndexesChange } = renderRouting({ variant: 'remote', initial: { auto: false } });

        await userEvent.type(screen.getByTestId('streamsCreateDestinationIndex'), name);

        expect(onIndexesChange).toHaveBeenLastCalledWith({
          logsIndex: name,
          metricsIndex: name,
          tracesIndex: name,
        });
        expect(screen.getByTestId('streamsCreateDestinationIndex')).toHaveValue(name);
      }
    );

    it('shows All for three identical raw names and per-signal for logs-a-b/metrics-a-b/traces-a-b', () => {
      const { unmount } = renderRouting({
        variant: 'remote',
        initial: {
          auto: false,
          logsIndex: 'shared-idx',
          metricsIndex: 'shared-idx',
          tracesIndex: 'shared-idx',
        },
      });

      expect(allScopeButton()).toBeEnabled();
      expect(allScopeButton()).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('streamsCreateDestinationIndex')).toHaveValue('shared-idx');

      unmount();
      renderRouting({
        variant: 'remote',
        initial: {
          auto: false,
          logsIndex: 'logs-a-b',
          metricsIndex: 'metrics-a-b',
          tracesIndex: 'traces-a-b',
        },
      });

      expect(allScopeButton()).toBeDisabled();
      expect(screen.queryByTestId('streamsCreateDestinationIndex')).toBeNull();
      expect(screen.getByTestId('streamsCreateDestinationIndexScope-logs')).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(screen.getByTestId('streamsCreateDestinationLogsIndex')).toHaveValue('logs-a-b');
    });

    it('opens on the first filled signal when names differ', () => {
      renderRouting({
        variant: 'remote',
        initial: { auto: false, logsIndex: '', metricsIndex: 'm-idx', tracesIndex: '' },
      });

      expect(allScopeButton()).toBeDisabled();
      expect(screen.getByTestId('streamsCreateDestinationIndexScope-metrics')).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(screen.getByTestId('streamsCreateDestinationMetricsIndex')).toHaveValue('m-idx');
    });

    it('makes All available again once the same name is typed into each signal', async () => {
      renderRouting({ variant: 'remote', initial: { auto: false } });

      await selectScope('logs');
      await userEvent.type(screen.getByTestId('streamsCreateDestinationLogsIndex'), 'shared-idx');
      expect(allScopeButton()).toBeDisabled();

      await selectScope('metrics');
      await userEvent.type(
        screen.getByTestId('streamsCreateDestinationMetricsIndex'),
        'shared-idx'
      );
      expect(allScopeButton()).toBeDisabled();

      await selectScope('traces');
      await userEvent.type(screen.getByTestId('streamsCreateDestinationTracesIndex'), 'shared-idx');
      expect(allScopeButton()).toBeEnabled();

      await selectScope('all');
      expect(screen.getByTestId('streamsCreateDestinationIndex')).toHaveValue('shared-idx');
    });

    it('uses help and error text without signal patterns', async () => {
      renderRouting({
        variant: 'remote',
        initial: { auto: false },
        errors: { logsIndexError: 'invalidName' },
      });

      expect(
        screen.getByText('The same index name is used for logs, metrics, and traces.')
      ).toBeInTheDocument();
      expect(screen.getByText('Enter a valid index name.')).toBeInTheDocument();

      await selectScope('metrics');
      expect(
        screen.getByText('Optional. Leave blank to skip the Metrics signal.')
      ).toBeInTheDocument();
      expect(screen.getByText('Fix the Logs value.')).toBeInTheDocument();
      expect(screen.queryByText(/-\*-\*/)).toBeNull();
      expect(screen.queryByText('Enter a valid data stream name.')).toBeNull();
    });

    it('clears the indices when switching back to Auto', async () => {
      const { onAutoChange, onIndexesChange } = renderRouting({
        variant: 'remote',
        initial: { auto: false, logsIndex: 'my-index' },
      });

      await selectAuto();

      expect(onAutoChange).toHaveBeenLastCalledWith(true);
      expect(onIndexesChange).toHaveBeenLastCalledWith({
        logsIndex: '',
        metricsIndex: '',
        tracesIndex: '',
      });
    });
  });

  describe('local variant', () => {
    it('keeps the write targets switch, signal prefixes and test subjects', async () => {
      const { onIndexesChange } = renderRouting({ variant: 'local' });

      expect(screen.getByTestId('streamsCreateDestinationSetWriteTargets')).toBeInTheDocument();
      expect(
        screen.getByText(
          "Use each document's target, or derive a data stream name from its metadata."
        )
      ).toBeInTheDocument();

      await selectFixed();
      expect(screen.getByText('logs / metrics / traces')).toBeInTheDocument();
      expect(screen.getByTestId('streamsCreateDestinationIndex')).toHaveAttribute(
        'placeholder',
        'dataset-namespace'
      );

      await userEvent.type(screen.getByTestId('streamsCreateDestinationIndex'), 'app-default');
      expect(onIndexesChange).toHaveBeenLastCalledWith({
        logsIndex: 'logs-app-default',
        metricsIndex: 'metrics-app-default',
        tracesIndex: 'traces-app-default',
      });

      await selectScope('logs');
      expect(screen.getByText('logs-')).toBeInTheDocument();
      expect(screen.getByTestId('streamsCreateDestinationLogsIndex')).toHaveValue('app-default');
    });

    it('treats logs-a-b, metrics-a-b and traces-a-b as one name under All', () => {
      renderRouting({
        variant: 'local',
        initial: {
          auto: false,
          logsIndex: 'logs-a-b',
          metricsIndex: 'metrics-a-b',
          tracesIndex: 'traces-a-b',
        },
      });

      expect(allScopeButton()).toBeEnabled();
      expect(screen.getByTestId('streamsCreateDestinationIndex')).toHaveValue('a-b');
    });
  });
});

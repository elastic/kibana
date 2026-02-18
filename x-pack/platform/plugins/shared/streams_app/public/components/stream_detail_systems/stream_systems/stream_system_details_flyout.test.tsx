/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { Streams, System } from '@kbn/streams-schema';
import { StreamSystemDetailsFlyout } from './stream_system_details_flyout';

jest.mock('../../../hooks/use_stream_systems_api', () => ({
  useStreamSystemsApi: () => ({
    upsertSystem: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../../hooks/use_kibana', () => ({
  useKibana: () => ({
    dependencies: {
      start: {
        streams: {
          streamsRepositoryClient: {
            fetch: jest.fn().mockResolvedValue(undefined),
          },
        },
        share: {
          url: {
            locators: {
              useUrl: () => undefined,
            },
          },
        },
      },
    },
  }),
}));

jest.mock('../../../hooks/use_stream_detail', () => ({
  useStreamDetail: () => ({
    definition: {},
  }),
}));

jest.mock('../../../hooks/use_timefilter', () => ({
  useTimefilter: () => ({
    timeState: {
      asAbsoluteTimeRange: {
        from: '2020-01-01T00:00:00.000Z',
        to: '2020-01-02T00:00:00.000Z',
      },
    },
  }),
}));

jest.mock('../../../hooks/use_streams_app_fetch', () => ({
  useStreamsAppFetch: () => ({
    value: undefined,
    loading: false,
    error: undefined,
    refresh: jest.fn(),
  }),
}));

jest.mock('../../data_management/shared', () => {
  const ReactMock = jest.requireActual('react') as typeof import('react');

  interface MockEditableConditionPanelProps {
    isEditingCondition: boolean;
    setCondition: (condition: { field: string; eq: string }) => void;
    onValidityChange?: (isValid: boolean) => void;
  }

  return {
    EditableConditionPanel: (props: MockEditableConditionPanelProps) => {
      const { isEditingCondition, setCondition, onValidityChange } = props;
      const callbacksRef = ReactMock.useRef({ setCondition, onValidityChange });
      callbacksRef.current = { setCondition, onValidityChange };

      ReactMock.useEffect(() => {
        if (!isEditingCondition) return;

        callbacksRef.current.setCondition({ field: 'service.name', eq: 'updated' });
        callbacksRef.current.onValidityChange?.(false);
      }, [isEditingCondition]);
      return ReactMock.createElement('div', { 'data-test-subj': 'mockEditableConditionPanel' });
    },
  };
});

describe('StreamSystemDetailsFlyout', () => {
  it('disables save changes when the condition editor is invalid', async () => {
    const user = userEvent.setup();
    const system: System = {
      type: 'system',
      name: 'test-system',
      description: 'desc',
      filter: { field: 'service.name', eq: 'initial' },
    };

    const definition = { name: 'logs' } as unknown as Streams.all.Definition;

    render(
      <I18nProvider>
        <StreamSystemDetailsFlyout
          system={system}
          definition={definition}
          closeFlyout={() => {}}
          refreshSystems={() => {}}
        />
      </I18nProvider>
    );

    await user.click(screen.getByTestId('system_identification_existing_save_filter_button'));

    await waitFor(() => {
      expect(
        screen.getByTestId('system_identification_existing_save_changes_button')
      ).toBeDisabled();
    });
  });
});

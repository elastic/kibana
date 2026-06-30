/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ChangeHistoryModal } from '../components/modal/change_history_modal';
import { ChangeHistoryTrigger } from '../components/modal/change_history_trigger';
import type { ChangeHistoryAdapter } from '../types/change_history_adapter';
import { ChangeHistoryProvider } from './change_history_provider';
import { useChangeHistoryConfig } from './use_change_history_config';
import {
  TEST_OBJECT_ID_A,
  TEST_OBJECT_ID_B,
  TEST_OBJECT_TITLE,
} from '../test_utils/change_history_test_fixtures';
import { createQueryClientWrapper } from '../test_utils/create_query_client_wrapper';
import { ChangeHistoryTelemetryEventTypes } from '../telemetry/types';

const { wrapper: QueryClientWrapper } = createQueryClientWrapper();

const testScope = {
  module: 'stack',
  dataset: 'workflows',
  objectType: 'workflow',
};

const adapter: ChangeHistoryAdapter = {
  listChanges: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  getChange: jest.fn(),
};

const Harness = ({
  objectId,
  reportEvent = undefined,
  telemetryEnabled = true,
}: {
  objectId: string;
  reportEvent?: jest.Mock;
  telemetryEnabled?: boolean;
}) => (
  <I18nProvider>
    <QueryClientWrapper>
      <ChangeHistoryProvider
        objectId={objectId}
        adapter={adapter}
        labels={{ previewTitle: TEST_OBJECT_TITLE }}
        renderPreview={() => <div data-test-subj="previewPanel" />}
        scope={reportEvent ? testScope : undefined}
        analytics={reportEvent ? { reportEvent } : undefined}
        features={{ telemetry: telemetryEnabled }}
      >
        <ChangeHistoryTrigger />
        <ChangeHistoryModal />
      </ChangeHistoryProvider>
    </QueryClientWrapper>
  </I18nProvider>
);

describe('ChangeHistoryProvider', () => {
  it('closes the modal when objectId changes', () => {
    const { rerender } = render(<Harness objectId={TEST_OBJECT_ID_A} />);

    fireEvent.click(screen.getByTestId('changeHistoryTrigger'));
    expect(screen.getByTestId('changeHistoryModal')).toBeInTheDocument();

    rerender(<Harness objectId={TEST_OBJECT_ID_B} />);
    expect(screen.queryByTestId('changeHistoryModal')).not.toBeInTheDocument();
  });

  it('exposes a no-op telemetry reporter when analytics is omitted', () => {
    const reportEvent = jest.fn();
    const Probe = () => {
      const { telemetry } = useChangeHistoryConfig();
      telemetry.reportOpened();
      return null;
    };

    render(
      <I18nProvider>
        <QueryClientWrapper>
          <ChangeHistoryProvider
            objectId={TEST_OBJECT_ID_A}
            adapter={adapter}
            labels={{ previewTitle: TEST_OBJECT_TITLE }}
            renderPreview={() => null}
          >
            <Probe />
          </ChangeHistoryProvider>
        </QueryClientWrapper>
      </I18nProvider>
    );

    expect(reportEvent).not.toHaveBeenCalled();
  });

  it('exposes a telemetry reporter that respects features.telemetry', () => {
    const reportEvent = jest.fn();

    const Probe = () => {
      const { telemetry } = useChangeHistoryConfig();
      telemetry.reportOpened();
      return null;
    };

    render(
      <I18nProvider>
        <QueryClientWrapper>
          <ChangeHistoryProvider
            objectId={TEST_OBJECT_ID_A}
            adapter={adapter}
            labels={{ previewTitle: TEST_OBJECT_TITLE }}
            renderPreview={() => null}
            scope={testScope}
            analytics={{ reportEvent }}
            features={{ telemetry: false }}
          >
            <Probe />
          </ChangeHistoryProvider>
        </QueryClientWrapper>
      </I18nProvider>
    );

    expect(reportEvent).not.toHaveBeenCalled();
  });

  it('wires scope and analytics into the config telemetry reporter', () => {
    const reportEvent = jest.fn();

    const Probe = () => {
      const { telemetry } = useChangeHistoryConfig();
      telemetry.reportFilterApplied({ filterType: 'actor', activeActorCount: 2 });
      return null;
    };

    render(
      <I18nProvider>
        <QueryClientWrapper>
          <ChangeHistoryProvider
            objectId={TEST_OBJECT_ID_A}
            adapter={adapter}
            labels={{ previewTitle: TEST_OBJECT_TITLE }}
            renderPreview={() => null}
            scope={testScope}
            analytics={{ reportEvent }}
          >
            <Probe />
          </ChangeHistoryProvider>
        </QueryClientWrapper>
      </I18nProvider>
    );

    expect(reportEvent).toHaveBeenCalledWith(ChangeHistoryTelemetryEventTypes.FilterApplied, {
      eventName: 'Change history filter applied',
      ...testScope,
      filterType: 'actor',
      activeActorCount: 2,
    });
  });
});

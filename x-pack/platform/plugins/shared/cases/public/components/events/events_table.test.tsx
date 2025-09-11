/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EventsTable } from './events_table';
import { AttachmentType, type CaseUI } from '../../../common';
import { TestProviders } from '../../common/mock';
import { useEventsDataView } from './use_events_data_view';

import type { FieldSpec } from '@kbn/data-views-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { searchEvents } from '../../containers/api';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';

jest.mock('./use_events_data_view');
jest.mock('../../containers/api');
jest.mock('../../common/lib/kibana');

jest.mock('./use_get_actions', () => ({ useGetActions: async () => [] }));

const caseData = {
  id: 'case-id',
  comments: [
    {
      type: AttachmentType.event,
      eventId: 'mock-event-id',
    },
  ],
} as unknown as CaseUI;

describe('EventsTable', () => {
  beforeEach(() => {
    jest.mocked(searchEvents).mockResolvedValue([
      {
        id: '1',
        raw: {},
        flattened: {},
      },
    ]);

    // WARN: if any of the fields listed as default in the table component is not present here, it will throw.
    jest.mocked(useEventsDataView).mockReturnValue({
      status: 'ready',
      dataView: new DataView({
        spec: {
          fields: {
            _id: {
              name: '_id',
            } as unknown as FieldSpec,
            'event.kind': {
              name: 'event.kind',
            } as unknown as FieldSpec,
            'host.name': {
              name: 'host.name',
            } as unknown as FieldSpec,
          },
        },
        fieldFormats: fieldFormatsMock,
      }),
    });
  });

  it('should render', async () => {
    render(<EventsTable caseData={caseData} />, { wrapper: TestProviders });

    // Table should render, but with no events, so empty prompt
    await waitFor(() => {
      expect(screen.getByTestId('discoverDocTable')).toBeInTheDocument();
    });
  });
});

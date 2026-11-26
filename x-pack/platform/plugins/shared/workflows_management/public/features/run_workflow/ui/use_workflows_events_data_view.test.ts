/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { WORKFLOWS_EVENTS_DATA_VIEW_FIELDS } from '@kbn/workflows';
import { applyWorkflowsEventsKqlCuratedFields } from './use_workflows_events_data_view';

describe('applyWorkflowsEventsKqlCuratedFields', () => {
  it('replaces ad-hoc data view fields with the shared workflows-events KQL field list', () => {
    const replaceAll = jest.fn();
    const dataView = {
      fields: { replaceAll },
    } as unknown as DataView;

    applyWorkflowsEventsKqlCuratedFields(dataView);

    expect(replaceAll).toHaveBeenCalledWith(
      expect.arrayContaining(
        WORKFLOWS_EVENTS_DATA_VIEW_FIELDS.map((field) =>
          expect.objectContaining({
            name: field.name,
            type: field.type,
            searchable: true,
          })
        )
      )
    );
    expect(replaceAll.mock.calls[0][0]).toHaveLength(WORKFLOWS_EVENTS_DATA_VIEW_FIELDS.length);
    expect(
      replaceAll.mock.calls[0][0].some((field: { name: string }) => field.name === 'spaceId')
    ).toBe(false);
  });
});

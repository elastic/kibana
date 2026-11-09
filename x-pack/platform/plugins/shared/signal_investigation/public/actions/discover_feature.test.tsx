/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { buildPhraseFilter } from '@kbn/es-query';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { buildDiscoverAppMenuSeed } from './discover_feature';
import { createDiscoverInvestigationFeature } from './discover_investigation_feature';

const indexPattern = { id: 'logs-view', title: 'logs-*' };

const logsDataView = {
  id: 'logs-view',
  title: 'logs-*',
  timeFieldName: '@timestamp',
  getIndexPattern: () => 'logs-*',
} as never;

const makeLicensing = (platinum: boolean): LicensingPluginStart =>
  ({
    license$: new BehaviorSubject({
      hasAtLeast: (minimum: string) => platinum && minimum === 'platinum',
    }),
  } as unknown as LicensingPluginStart);

const makeDoc = (fields: Record<string, unknown> = {}): DataTableRecord => ({
  id: 'row-1',
  raw: { _id: 'doc-1', _index: 'logs-generic-default' },
  flattened: {
    '@timestamp': ['2026-11-02T11:30:00.000Z'],
    'service.name': ['checkout'],
    ...fields,
  },
});

describe('buildDiscoverAppMenuSeed', () => {
  it('builds a Discover appMenu seed with entities from filters and KQL', () => {
    const filter = buildPhraseFilter(
      { name: 'service.name', type: 'string' },
      'checkout',
      indexPattern
    );
    const seed = buildDiscoverAppMenuSeed({
      timeRange: { from: 'now-15m', to: 'now' },
      filters: [filter],
      query: { language: 'kuery', query: 'host.name : "web-1"' },
      dataViewId: 'logs-view',
      indexPattern: 'logs-*',
    });

    expect(seed).toEqual({
      origin: { app: 'discover', surface: 'appMenu' },
      timeRange: { from: 'now-15m', to: 'now' },
      query: { language: 'kuery', query: 'host.name : "web-1"' },
      filters: [filter],
      dataViewId: 'logs-view',
      indexPattern: 'logs-*',
      entities: {
        'service.name': 'checkout',
        'host.name': 'web-1',
      },
    });
  });

  it('omits the session dataViewId when the Discover query is ES|QL', () => {
    const seed = buildDiscoverAppMenuSeed({
      timeRange: { from: 'now-15m', to: 'now' },
      query: { esql: 'FROM logs-* | SORT @timestamp DESC' },
      dataViewId: 'esql-temp-view',
      indexPattern: 'logs-*',
    });

    expect(seed?.dataViewId).toBeUndefined();
    expect(seed?.indexPattern).toBe('logs-*');
    expect(seed?.query).toEqual({ esql: 'FROM logs-* | SORT @timestamp DESC' });
  });
});

describe('createDiscoverInvestigationFeature', () => {
  const currentAppId$ = new BehaviorSubject<string | undefined>('discover');

  it('gates app menu and document actions on Platinum and opens with the expected session', async () => {
    const openInvestigation = jest.fn(async () => {});
    const basicFeature = createDiscoverInvestigationFeature({
      licensing: makeLicensing(false),
      openInvestigation,
      currentAppId$,
    });

    expect(basicFeature.isAvailable()).toBe(false);
    basicFeature.openFromAppMenu({ timeRange: { from: 'now-15m', to: 'now' } });
    expect(openInvestigation).not.toHaveBeenCalled();

    const { container: basicContainer } = render(
      <>{basicFeature.renderLogDocumentAction({ doc: makeDoc() })}</>
    );
    expect(basicContainer).toBeEmptyDOMElement();

    const platinumFeature = createDiscoverInvestigationFeature({
      licensing: makeLicensing(true),
      openInvestigation,
      currentAppId$,
    });
    expect(platinumFeature.isAvailable()).toBe(true);

    platinumFeature.openFromAppMenu({
      timeRange: { from: 'now-15m', to: 'now' },
      dataViewId: 'logs-view',
      indexPattern: 'logs-*',
    });
    await waitFor(() => {
      expect(openInvestigation).toHaveBeenCalledWith({
        session: 'start',
        seed: expect.objectContaining({
          origin: { app: 'discover', surface: 'appMenu' },
          dataViewId: 'logs-view',
          indexPattern: 'logs-*',
        }),
      });
    });

    const user = userEvent.setup();
    render(
      <>
        {platinumFeature.renderLogDocumentAction({
          doc: makeDoc(),
          dataView: logsDataView,
        })}
      </>
    );

    await user.click(await screen.findByTestId('discoverLogDocFindRelatedChanges'));
    expect(openInvestigation).toHaveBeenLastCalledWith({
      session: 'inherit',
      seed: expect.objectContaining({
        origin: { app: 'discover', surface: 'document', documentId: 'doc-1' },
        dataViewId: 'logs-view',
        indexPattern: 'logs-*',
        entities: { 'service.name': 'checkout' },
      }),
    });
  });

  it('uses the data view time field when the document has no @timestamp', async () => {
    const openInvestigation = jest.fn(async () => {});
    const feature = createDiscoverInvestigationFeature({
      licensing: makeLicensing(true),
      openInvestigation,
      currentAppId$,
    });
    const user = userEvent.setup();

    render(
      <>
        {feature.renderLogDocumentAction({
          doc: {
            id: 'row-2',
            raw: { _id: 'doc-2', _index: 'logs-generic-default' },
            flattened: {
              'event.ingested': ['2026-11-02T12:00:00.000Z'],
              'service.name': ['checkout'],
            },
          },
          dataView: {
            id: 'logs-view',
            timeFieldName: 'event.ingested',
            getIndexPattern: () => 'logs-*',
          } as never,
        })}
      </>
    );

    await user.click(await screen.findByTestId('discoverLogDocFindRelatedChanges'));
    expect(openInvestigation).toHaveBeenCalledWith({
      session: 'inherit',
      seed: expect.objectContaining({
        timeRange: {
          from: '2026-11-02T11:50:00.000Z',
          to: '2026-11-02T12:10:00.000Z',
        },
        entities: { 'service.name': 'checkout' },
      }),
    });
  });
});

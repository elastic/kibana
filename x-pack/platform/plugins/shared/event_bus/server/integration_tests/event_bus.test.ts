/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { InternalCoreStart } from '@kbn/core-lifecycle-server-internal';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type {
  createRootWithCorePlugins,
  TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { getEsNames } from '../es/names';
import { ResourceInstaller } from '../es/resource_installer';
import { EventPublisher } from '../publisher';
import { readBatch } from '../tail/tail_reader';
import { fromStored, toStored } from '../tail/cursor';
import { BROADCAST_TARGET, type PublishEventParams } from '../types';

// Use a dedicated base name so this test's datastream is isolated from the
// datastream the (background-loaded) eventBus plugin bootstraps in the harness.
const names = getEsNames('.kibana-eb-it');

const logger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as unknown as Logger;

describe('event bus integration', () => {
  let manageES: TestElasticsearchUtils;
  let kbnRoot: ReturnType<typeof createRootWithCorePlugins>;
  let coreStart: InternalCoreStart;
  let esClient: ElasticsearchClient;
  let publisher: EventPublisher;

  const publishAndRefresh = async (params: PublishEventParams): Promise<string> => {
    const id = await publisher.publish(params);
    await esClient.indices.refresh({ index: names.dataStream });
    return id;
  };

  beforeAll(async () => {
    const { startES, startKibana } = createTestServers({ adjustTimeout: jest.setTimeout });
    const testServers = await Promise.all([startES(), startKibana()]);
    manageES = testServers[0];
    ({ root: kbnRoot, coreStart } = testServers[1]);

    esClient = coreStart.elasticsearch.client.asInternalUser;

    // M0: bootstrap our transport datastream + template.
    const installer = new ResourceInstaller({ esClient, logger, names, retention: '7d' });
    const ok = await installer.install();
    expect(ok).toBe(true);

    publisher = new EventPublisher({ esClient, names, nodeId: 'node-A' });
  });

  afterAll(async () => {
    try {
      await esClient.indices.deleteDataStream({ name: names.dataStream });
    } catch (e) {
      // ignore
    }
    try {
      await esClient.indices.deleteIndexTemplate({ name: names.indexTemplate });
    } catch (e) {
      // ignore
    }
    await kbnRoot?.shutdown();
    await manageES?.stop();
  });

  it('M0: creates a hidden data stream with an unindexed payload mapping', async () => {
    const dataStreams = await esClient.indices.getDataStream({ name: names.dataStream });
    expect(dataStreams.data_streams).toHaveLength(1);

    const templateExists = await esClient.indices.existsIndexTemplate({
      name: names.indexTemplate,
    });
    expect(templateExists).toBe(true);

    const mappingResponse = await esClient.indices.getMapping({ index: names.dataStream });
    const backingIndex = Object.keys(mappingResponse)[0];
    const properties = mappingResponse[backingIndex].mappings.properties ?? {};
    expect((properties.payload as { enabled?: boolean }).enabled).toBe(false);
    expect(properties.target).toEqual({ type: 'keyword' });
  });

  it('M1: publish → tail round trip returns the event with all fields', async () => {
    const payload = { hello: 'm1' };
    const id = await publishAndRefresh({ type: 'it.m1', payload });

    const { events, nextCursor, hasMore } = await readBatch({
      esClient,
      index: names.dataStream,
      filter: [{ terms: { 'event.type': ['it.m1'] } }],
      cursor: null,
      startTs: 0,
      safetyLagMs: 0,
      batchSize: 10,
    });

    expect(events).toHaveLength(1);
    expect(events[0].id).toBe(id);
    expect(events[0].type).toBe('it.m1');
    expect(events[0].source).toBe('node-A');
    expect(events[0].target).toBe(BROADCAST_TARGET);
    expect(events[0].payload).toEqual(payload);
    expect(hasMore).toBe(false);
    expect(nextCursor).not.toBeNull();
  });

  it('M2: broadcast reaches every node; directed reaches only the target node', async () => {
    await publishAndRefresh({ type: 'it.m2', target: BROADCAST_TARGET, payload: { t: 'all' } });
    await publishAndRefresh({ type: 'it.m2', target: 'node-A', payload: { t: 'A' } });
    await publishAndRefresh({ type: 'it.m2', target: 'node-B', payload: { t: 'B' } });

    const tagsFor = async (nodeId: string): Promise<string[]> => {
      const { events } = await readBatch({
        esClient,
        index: names.dataStream,
        filter: [
          { terms: { target: [BROADCAST_TARGET, nodeId] } },
          { terms: { 'event.type': ['it.m2'] } },
        ],
        cursor: null,
        startTs: 0,
        safetyLagMs: 0,
        batchSize: 10,
      });
      return events.map((event) => (event.payload as { t: string }).t).sort();
    };

    // node-A sees broadcast + its own directed event, never node-B's.
    expect(await tagsFor('node-A')).toEqual(['A', 'all']);
    // node-B sees broadcast + its own directed event, never node-A's.
    expect(await tagsFor('node-B')).toEqual(['B', 'all']);
  });

  it('M3: a durable consumer resumes from its stored cursor with no gap and no duplicate', async () => {
    const id1 = await publishAndRefresh({ type: 'it.m3', payload: { n: 1 } });
    const id2 = await publishAndRefresh({ type: 'it.m3', payload: { n: 2 } });

    const filter = [{ terms: { 'event.type': ['it.m3'] } }];
    const first = await readBatch({
      esClient,
      index: names.dataStream,
      filter,
      cursor: null,
      startTs: 0,
      safetyLagMs: 0,
      batchSize: 10,
    });
    expect(first.events.map((event) => event.id)).toEqual([id1, id2]);

    // Simulate a restart: the cursor survives as Task Manager state (round-tripped
    // through its serializable form) and the consumer resumes from it.
    const resumedCursor = fromStored(toStored(first.nextCursor));

    const id3 = await publishAndRefresh({ type: 'it.m3', payload: { n: 3 } });
    const id4 = await publishAndRefresh({ type: 'it.m3', payload: { n: 4 } });

    const second = await readBatch({
      esClient,
      index: names.dataStream,
      filter,
      cursor: resumedCursor,
      startTs: 0,
      safetyLagMs: 0,
      batchSize: 10,
    });

    // Exclusive cursor: only the two new events, no re-delivery of id1/id2.
    expect(second.events.map((event) => event.id)).toEqual([id3, id4]);
  });
});

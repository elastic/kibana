/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';

import {
  CloneWorkerProgress,
  Repository,
  WorkerProgress,
  WorkerReservedProgress,
} from '../../model';
import {
  RepositoryDeleteStatusReservedField,
  RepositoryGitStatusReservedField,
  RepositoryIndexName,
  RepositoryIndexNamePrefix,
  RepositoryLspIndexStatusReservedField,
  RepositoryReservedField,
} from '../indexer/schema';
import { AnyObject, EsClient } from '../lib/esqueue';
import { RepositoryObjectClient } from './repository_object_client';

const esClient = {
  get: async (_: AnyObject): Promise<any> => {
    Promise.resolve({});
  },
  search: async (_: AnyObject): Promise<any> => {
    Promise.resolve({});
  },
  update: async (_: AnyObject): Promise<any> => {
    Promise.resolve({});
  },
  delete: async (_: AnyObject): Promise<any> => {
    Promise.resolve({});
  },
  index: async (_: AnyObject): Promise<any> => {
    Promise.resolve({});
  },
};
const repoObjectClient = new RepositoryObjectClient((esClient as any) as EsClient);

afterEach(() => {
  sinon.restore();
});

test('CRUD of Repository', async () => {
  const repoUri = 'github.com/elastic/code';

  // Create
  const indexSpy = sinon.spy(esClient, 'index');
  const cObj: Repository = {
    uri: repoUri,
    url: 'https://github.com/elastic/code.git',
    org: 'elastic',
    name: 'code',
  };
  await repoObjectClient.setRepository(repoUri, cObj);
  expect(indexSpy.calledOnce).toBeTruthy();
  expect(indexSpy.getCall(0).args[0]).toEqual(
    expect.objectContaining({
      index: RepositoryIndexName(repoUri),
      id: RepositoryReservedField,
      body: JSON.stringify({
        [RepositoryReservedField]: cObj,
      }),
    })
  );

  // Read
  const getFake = sinon.fake.returns(
    Promise.resolve({
      _source: {
        [RepositoryReservedField]: cObj,
      },
    })
  );
  esClient.get = getFake;
  await repoObjectClient.getRepository(repoUri);
  expect(getFake.calledOnce).toBeTruthy();
  expect(getFake.getCall(0).args[0]).toEqual(
    expect.objectContaining({
      index: RepositoryIndexName(repoUri),
      id: RepositoryReservedField,
    })
  );

  // Update
  const updateSpy = sinon.spy(esClient, 'update');
  const uObj = {
    url: 'https://github.com/elastic/codesearch.git',
  };
  await repoObjectClient.updateRepository(repoUri, uObj);
  expect(updateSpy.calledOnce).toBeTruthy();
  expect(updateSpy.getCall(0).args[0]).toEqual(
    expect.objectContaining({
      index: RepositoryIndexName(repoUri),
      id: RepositoryReservedField,
      body: JSON.stringify({
        doc: {
          [RepositoryReservedField]: uObj,
        },
      }),
    })
  );
});

test('Get All Repositories', async () => {
  const cObj: Repository = {
    uri: 'github.com/elastic/code',
    url: 'https://github.com/elastic/code.git',
    org: 'elastic',
    name: 'code',
  };
  const searchFake = sinon.fake.returns(
    Promise.resolve({
      hits: {
        hits: [
          {
            _source: {
              [RepositoryReservedField]: cObj,
            },
          },
        ],
      },
    })
  );
  esClient.search = searchFake;
  await repoObjectClient.getAllRepositories();
  expect(searchFake.calledOnce).toBeTruthy();
  expect(searchFake.getCall(0).args[0]).toEqual(
    expect.objectContaining({
      index: `${RepositoryIndexNamePrefix}*`,
    })
  );
});

test('CRUD of Repository Git Status', async () => {
  const repoUri = 'github.com/elastic/code';

  // Create
  const indexSpy = sinon.spy(esClient, 'index');
  const cObj: CloneWorkerProgress = {
    uri: repoUri,
    progress: WorkerReservedProgress.COMPLETED,
    timestamp: new Date(),
  };
  await repoObjectClient.setRepositoryGitStatus(repoUri, cObj);
  expect(indexSpy.calledOnce).toBeTruthy();
  expect(indexSpy.getCall(0).args[0]).toEqual(
    expect.objectContaining({
      index: RepositoryIndexName(repoUri),
      id: RepositoryGitStatusReservedField,
      body: JSON.stringify({
        [RepositoryGitStatusReservedField]: cObj,
      }),
    })
  );

  // Read
  const getFake = sinon.fake.returns(
    Promise.resolve({
      _source: {
        [RepositoryGitStatusReservedField]: cObj,
      },
    })
  );
  esClient.get = getFake;
  await repoObjectClient.getRepositoryGitStatus(repoUri);
  expect(getFake.calledOnce).toBeTruthy();
  expect(getFake.getCall(0).args[0]).toEqual(
    expect.objectContaining({
      index: RepositoryIndexName(repoUri),
      id: RepositoryGitStatusReservedField,
    })
  );

  // Update
  const updateSpy = sinon.spy(esClient, 'update');
  const uObj = {
    progress: 50,
  };
  await repoObjectClient.updateRepositoryGitStatus(repoUri, uObj);
  expect(updateSpy.calledOnce).toBeTruthy();
  expect(updateSpy.getCall(0).args[0]).toEqual(
    expect.objectContaining({
      index: RepositoryIndexName(repoUri),
      id: RepositoryGitStatusReservedField,
      body: JSON.stringify({
        doc: {
          [RepositoryGitStatusReservedField]: uObj,
        },
      }),
    })
  );
});

test('CRUD of Repository LSP Index Status', async () => {
  const repoUri = 'github.com/elastic/code';

  // Create
  const indexSpy = sinon.spy(esClient, 'index');
  const cObj: WorkerProgress = {
    uri: repoUri,
    progress: WorkerReservedProgress.COMPLETED,
    timestamp: new Date(),
  };
  await repoObjectClient.setRepositoryLspIndexStatus(repoUri, cObj);
  expect(indexSpy.calledOnce).toBeTruthy();
  expect(indexSpy.getCall(0).args[0]).toEqual(
    expect.objectContaining({
      index: RepositoryIndexName(repoUri),
      id: RepositoryLspIndexStatusReservedField,
      body: JSON.stringify({
        [RepositoryLspIndexStatusReservedField]: cObj,
      }),
    })
  );

  // Read
  const getFake = sinon.fake.returns(
    Promise.resolve({
      _source: {
        [RepositoryLspIndexStatusReservedField]: cObj,
      },
    })
  );
  esClient.get = getFake;
  await repoObjectClient.getRepositoryLspIndexStatus(repoUri);
  expect(getFake.calledOnce).toBeTruthy();
  expect(getFake.getCall(0).args[0]).toEqual(
    expect.objectContaining({
      index: RepositoryIndexName(repoUri),
      id: RepositoryLspIndexStatusReservedField,
    })
  );

  // Update
  const updateSpy = sinon.spy(esClient, 'update');
  const uObj = {
    progress: 50,
  };
  await repoObjectClient.updateRepositoryLspIndexStatus(repoUri, uObj);
  expect(updateSpy.calledOnce).toBeTruthy();
  expect(updateSpy.getCall(0).args[0]).toEqual(
    expect.objectContaining({
      index: RepositoryIndexName(repoUri),
      id: RepositoryLspIndexStatusReservedField,
      body: JSON.stringify({
        doc: {
          [RepositoryLspIndexStatusReservedField]: uObj,
        },
      }),
    })
  );
});

test('CRUD of Repository Delete Status', async () => {
  const repoUri = 'github.com/elastic/code';

  // Create
  const indexSpy = sinon.spy(esClient, 'index');
  const cObj: CloneWorkerProgress = {
    uri: repoUri,
    progress: WorkerReservedProgress.COMPLETED,
    timestamp: new Date(),
  };
  await repoObjectClient.setRepositoryDeleteStatus(repoUri, cObj);
  expect(indexSpy.calledOnce).toBeTruthy();
  expect(indexSpy.getCall(0).args[0]).toEqual(
    expect.objectContaining({
      index: RepositoryIndexName(repoUri),
      id: RepositoryDeleteStatusReservedField,
      body: JSON.stringify({
        [RepositoryDeleteStatusReservedField]: cObj,
      }),
    })
  );

  // Read
  const getFake = sinon.fake.returns(
    Promise.resolve({
      _source: {
        [RepositoryDeleteStatusReservedField]: cObj,
      },
    })
  );
  esClient.get = getFake;
  await repoObjectClient.getRepositoryDeleteStatus(repoUri);
  expect(getFake.calledOnce).toBeTruthy();
  expect(getFake.getCall(0).args[0]).toEqual(
    expect.objectContaining({
      index: RepositoryIndexName(repoUri),
      id: RepositoryDeleteStatusReservedField,
    })
  );

  // Update
  const updateSpy = sinon.spy(esClient, 'update');
  const uObj = {
    progress: 50,
  };
  await repoObjectClient.updateRepositoryDeleteStatus(repoUri, uObj);
  expect(updateSpy.calledOnce).toBeTruthy();
  expect(updateSpy.getCall(0).args[0]).toEqual(
    expect.objectContaining({
      index: RepositoryIndexName(repoUri),
      id: RepositoryDeleteStatusReservedField,
      body: JSON.stringify({
        doc: {
          [RepositoryDeleteStatusReservedField]: uObj,
        },
      }),
    })
  );
});

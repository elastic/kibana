/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('fs/promises');
import { renderFullStoryLibraryFactory, FULLSTORY_LIBRARY_PATH } from './fullstory';
import fs from 'fs/promises';

const fsMock = fs as jest.Mocked<typeof fs>;

describe('renderFullStoryLibraryFactory', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    fsMock.readFile.mockResolvedValue(Buffer.from('fake fs src'));
  });
  afterAll(() => jest.restoreAllMocks());

  it('successfully returns file contents', async () => {
    const render = renderFullStoryLibraryFactory();

    const { body } = await render();
    expect(fsMock.readFile).toHaveBeenCalledWith(FULLSTORY_LIBRARY_PATH);
    expect(body.toString()).toEqual('fake fs src');
  });

  it('only reads from file system once callback is invoked', async () => {
    const render = renderFullStoryLibraryFactory();
    expect(fsMock.readFile).not.toHaveBeenCalled();
    await render();
    expect(fsMock.readFile).toHaveBeenCalledTimes(1);
  });

  it('does not read from filesystem on subsequent calls', async () => {
    const render = renderFullStoryLibraryFactory();
    await render();
    expect(fsMock.readFile).toHaveBeenCalledTimes(1);
    await render();
    expect(fsMock.readFile).toHaveBeenCalledTimes(1);
    await render();
    expect(fsMock.readFile).toHaveBeenCalledTimes(1);
  });

  it('returns max-age cache-control in dist', async () => {
    const render = renderFullStoryLibraryFactory(true);
    const { headers } = await render();
    expect(headers).toEqual({
      'cache-control': 'max-age=31536000',
    });
  });

  it('returns must-revalidate cache-control and sha1 etag in dev', async () => {
    const render = renderFullStoryLibraryFactory(false);
    const { headers } = await render();
    expect(headers).toEqual({
      'cache-control': 'must-revalidate',
      etag: '1e02f94b45750ba9284c111d31ae7e59c13b8e6e',
    });
  });
});

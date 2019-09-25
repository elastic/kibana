/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ArtifactLib } from './artifact';
import { InMemoryArtifactStore } from './adapters/artifact_store/in_memory';
import { InMemoryHttpAdapter } from './adapters/http_adapter/in_memory';

async function readStreamAsString(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    let acc: Buffer;
    stream.on('data', data => {
      if (acc) {
        acc = Buffer.concat([acc, data]);
      } else {
        acc = data;
      }
    });

    stream.on('error', err => reject(err));

    stream.on('end', () => resolve(acc.toString()));
  });
}

describe('Artifact lib', () => {
  describe('download', () => {
    it('should download the artifacts and set it in cache if there is no cache', async () => {
      const store = new InMemoryArtifactStore();
      const httpAdapter = new InMemoryHttpAdapter();
      httpAdapter.responses[
        'https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-7.3.2-i386.deb'
      ] = Buffer.from('testartifcat');
      httpAdapter.responses[
        'https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-7.3.2-i386.deb.sha512'
      ] = `bd59f015861d1191cfa152369abbced5ded37ce1ba549d8ca19106ec99eb694bf1f62ae6f8f7fb8501fc21f58653db82ae11a6198a728bc1a4f5220c93415ff7 filebeat-7.3.2-i386.deb.sha512`;
      const artifact = new ArtifactLib(store, httpAdapter);

      const fileStream = await artifact.download('beats/filebeat/filebeat-7.3.2-i386.deb');
      const file = await readStreamAsString(fileStream);

      expect(file).toBe('testartifcat');
    });

    it('should throw if the sha512 is not valid', async () => {
      const store = new InMemoryArtifactStore();
      const httpAdapter = new InMemoryHttpAdapter();
      httpAdapter.responses[
        'https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-7.3.2-i386.deb'
      ] = Buffer.from('testartifcat');
      httpAdapter.responses[
        'https://artifacts.elastic.co/downloads/beats/filebeat/filebeat-7.3.2-i386.deb.sha512'
      ] = `invalidsha filebeat-7.3.2-i386.deb.sha512`;
      const artifact = new ArtifactLib(store, httpAdapter);

      expect(artifact.download('beats/filebeat/filebeat-7.3.2-i386.deb')).rejects.toThrow(
        /Impossible to download beats\/filebeat\/filebeat-7.3.2-i386.deb/
      );
    });

    it('should use the cache if an entry exists', async () => {
      const store = new InMemoryArtifactStore();
      store.cache['beats/filebeat/filebeat-7.3.2-i386.deb'] = Buffer.from('testartifcat');

      const httpAdapter = new InMemoryHttpAdapter();
      const artifact = new ArtifactLib(store, httpAdapter);

      const fileStream = await artifact.download('beats/filebeat/filebeat-7.3.2-i386.deb');
      const file = await readStreamAsString(fileStream);

      expect(file).toBe('testartifcat');
    });
  });
});

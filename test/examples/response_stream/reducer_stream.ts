/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fetch from 'node-fetch';
import { format as formatUrl } from 'url';

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../functional/ftr_provider_context';

import { parseStream } from './parse_stream';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const config = getService('config');
  const kibanaServerUrl = formatUrl(config.get('servers.kibana'));

  describe('POST /internal/response_stream/reducer_stream', () => {
    it('should return full data without streaming', async () => {
      const resp = await supertest
        .post('/internal/response_stream/reducer_stream')
        .set('kbn-xsrf', 'kibana')
        .send({
          timeout: 1,
        })
        .expect(200);

      expect(Buffer.isBuffer(resp.body)).to.be(true);

      const chunks: string[] = resp.body.toString().split('\n');

      expect(chunks.length).to.be(201);

      const lastChunk = chunks.pop();
      expect(lastChunk).to.be('');

      let data: any[] = [];

      expect(() => {
        data = chunks.map((c) => JSON.parse(c));
      }).not.to.throwError();

      data.forEach((d) => {
        expect(typeof d.type).to.be('string');
      });

      const progressData = data.filter((d) => d.type === 'update_progress');
      expect(progressData.length).to.be(100);
      expect(progressData[0].payload).to.be(1);
      expect(progressData[progressData.length - 1].payload).to.be(100);
    });

    it('should return data in chunks with streaming', async () => {
      const response = await fetch(`${kibanaServerUrl}/internal/response_stream/reducer_stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'kbn-xsrf': 'stream',
        },
        body: JSON.stringify({ timeout: 1 }),
      });

      const stream = response.body;

      expect(stream).not.to.be(null);

      if (stream !== null) {
        const progressData: any[] = [];

        for await (const action of parseStream(stream)) {
          expect(action.type).not.to.be('error');
          if (action.type === 'update_progress') {
            progressData.push(action);
          }
        }

        expect(progressData.length).to.be(100);
        expect(progressData[0].payload).to.be(1);
        expect(progressData[progressData.length - 1].payload).to.be(100);
      }
    });
  });
};

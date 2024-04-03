/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import expect from '@kbn/expect';
import type { Test } from 'supertest';
import type { PluginFunctionalProviderContext } from '../../services';

export default function ({ getService }: PluginFunctionalProviderContext) {
  const supertest = getService('supertest');

  describe('route', function () {
    describe('timeouts', function () {
      const writeBodyCharAtATime = (request: Test, body: string, interval: number) => {
        return new Promise((resolve, reject) => {
          let i = 0;
          const intervalId = setInterval(() => {
            if (i < body.length) {
              request.write(body[i++]);
            } else {
              clearInterval(intervalId);
              request.end((err, res) => {
                resolve(res);
              });
            }
          }, interval);
          request.on('error', (err) => {
            clearInterval(intervalId);
            reject(err);
          });
        });
      };

      describe('payload', function () {
        it(`should timeout if POST payload sending is too slow`, async () => {
          // start the request
          const request = supertest
            .post('/short_payload_timeout')
            .set('Content-Type', 'application/json')
            .set('Transfer-Encoding', 'chunked')
            .set('kbn-xsrf', 'true');

          const result = writeBodyCharAtATime(request, '{"foo":"bar"}', 20);

          await result.then(
            (res) => {
              expect(res).to.be(undefined);
            },
            (err) => {
              expect(err.message).to.be('Request Timeout');
            }
          );
        });

        it(`should not timeout if POST payload sending is quick`, async () => {
          // start the request
          const request = supertest
            .post('/longer_payload_timeout')
            .set('Content-Type', 'application/json')
            .set('Transfer-Encoding', 'chunked')
            .set('kbn-xsrf', 'true');

          const result = writeBodyCharAtATime(request, '{"foo":"bar"}', 20);

          await result.then(
            (res) => {
              expect(res).to.have.property('statusCode', 200);
            },
            (err) => {
              expect(err).to.be(undefined);
            }
          );
        });
      });

      describe('idle socket', function () {
        it('should timeout if payload sending has too long of an idle period', async function () {
          // start the request
          const request = supertest
            .post('/short_idle_socket_timeout')
            .set('Content-Type', 'application/json')
            .set('Transfer-Encoding', 'chunked')
            .set('kbn-xsrf', 'true');

          const result = writeBodyCharAtATime(request, '{"responseDelay":100}', 20);

          await result.then(
            (res) => {
              expect(res).to.be(undefined);
            },
            (err) => {
              expect(err.message).to.be('socket hang up');
            }
          );
        });

        it('should not timeout if payload sending does not have too long of an idle period', async function () {
          // start the request
          const request = supertest
            .post('/longer_idle_socket_timeout')
            .set('Content-Type', 'application/json')
            .set('Transfer-Encoding', 'chunked')
            .set('kbn-xsrf', 'true');

          const result = writeBodyCharAtATime(request, '{"responseDelay":0}', 20);

          await result.then(
            (res) => {
              expect(res).to.have.property('statusCode', 200);
            },
            (err) => {
              expect(err).to.be(undefined);
            }
          );
        });

        it('should timeout if servers response is too slow', async () => {
          await supertest
            .post('/short_idle_socket_timeout')
            .send({ responseDelay: 100 })
            .set('Content-Type', 'application/json')
            .set('kbn-xsrf', 'true')
            .then(() => expect('to throw').to.be('but it did NOT'))
            .catch((error) => expect(error.message).to.be('socket hang up'));
        });

        it('should not timeout if servers response is fast enough', async () => {
          await supertest
            .post('/longer_idle_socket_timeout')
            .send({ responseDelay: 100 })
            .set('Content-Type', 'application/json')
            .set('kbn-xsrf', 'true')
            .expect(200);
        });
      });
    });
  });
}

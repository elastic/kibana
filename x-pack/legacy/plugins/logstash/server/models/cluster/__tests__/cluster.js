/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Cluster } from '../cluster';

describe('cluster', () => {
  describe('Cluster', () => {
    describe('fromUpstreamJSON factory method', () => {
      const upstreamJSON = {
        cluster_uuid: 'S-S4NNZDRV-g9c-JrIhx6A',
      };

      it('returns correct Cluster instance', () => {
        const cluster = Cluster.fromUpstreamJSON(upstreamJSON);
        expect(cluster.uuid).to.be(upstreamJSON.cluster_uuid);
      });
    });
  });
});

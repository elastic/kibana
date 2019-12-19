/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BehaviorSubject } from 'rxjs';
import expect from '@kbn/expect';
import sinon from 'sinon';

import { XPackInfo } from '../../../xpack_main/server/lib/xpack_info';
import { licensingMock } from '../../../../../plugins/licensing/server/mocks';

const createLicense = () => {
  return licensingMock.createLicense({
    license: {
      uid: 'custom-uid',
      type: 'basic',
      mode: 'basic',
      status: 'active',
      expiryDateInMillis: 1286575200000,
    },
    features: {
      monitoring: {
        description: '...',
        isAvailable: true,
        isEnabled: true,
      },
    },
  });
};

describe('XPackInfo', () => {
  let mockServer;
  let mockElasticsearchPlugin;

  beforeEach(() => {
    mockServer = sinon.stub({
      plugins: { elasticsearch: mockElasticsearchPlugin },
      events: { on() {} },
      newPlatform: {
        setup: {
          plugins: {
            licensing: {},
          },
        },
      },
    });
  });

  describe('refreshNow()', () => {
    it('check new platform licensing plugin', async () => {
      const refresh = sinon.spy();
      const license$ = new BehaviorSubject(createLicense());
      const xPackInfo = new XPackInfo(mockServer, {
        licensing: {
          license$,
          refresh,
        },
      });

      let changed = false;
      license$.subscribe(() => (changed = true));
      await xPackInfo.refreshNow();
      expect(changed).to.be(true);
      sinon.assert.calledOnce(refresh);
    });
  });

  describe('Change type', () => {
    it('trigger event when license type changes', async () => {
      const license$ = new BehaviorSubject(createLicense());
      let changed = false;
      license$.subscribe(() => (changed = true));
      await license$.next(createLicense({ type: 'gold' }));
      expect(changed).to.be(true);
    });
  });
});

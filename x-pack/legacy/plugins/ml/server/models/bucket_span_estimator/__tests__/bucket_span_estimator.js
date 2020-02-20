/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { estimateBucketSpanFactory } from '../bucket_span_estimator';

// Mock callWithRequest with the ability to simulate returning different
// permission settings. On each call using `ml.privilegeCheck` we retrieve
// the last value from `permissions` and pass that to one of the permission
// settings. The tests call `ml.privilegeCheck` two times, the first time
// sufficient permissions should be returned, the second time insufficient
// permissions.
const permissions = [false, true];
const callWithRequest = method => {
  return new Promise(resolve => {
    if (method === 'ml.privilegeCheck') {
      resolve({
        cluster: {
          'cluster:monitor/xpack/ml/job/get': true,
          'cluster:monitor/xpack/ml/job/stats/get': true,
          'cluster:monitor/xpack/ml/datafeeds/get': true,
          'cluster:monitor/xpack/ml/datafeeds/stats/get': permissions.pop(),
        },
      });
      return;
    }
    resolve({});
  });
};

const callWithInternalUser = () => {
  return new Promise(resolve => {
    resolve({});
  });
};

// mock xpack_main plugin
function mockXpackMainPluginFactory(isEnabled = false, licenseType = 'platinum') {
  return {
    info: {
      isAvailable: () => true,
      feature: () => ({
        isEnabled: () => isEnabled,
      }),
      license: {
        getType: () => licenseType,
      },
    },
  };
}

// mock configuration to be passed to the estimator
const formConfig = {
  aggTypes: ['count'],
  duration: {},
  fields: [null],
  index: '',
  query: {
    bool: {
      must: [{ match_all: {} }],
      must_not: [],
    },
  },
};

describe('ML - BucketSpanEstimator', () => {
  it('call factory', () => {
    expect(function() {
      estimateBucketSpanFactory(callWithRequest, callWithInternalUser);
    }).to.not.throwError('Not initialized.');
  });

  it('call factory and estimator with security disabled', done => {
    expect(function() {
      const estimateBucketSpan = estimateBucketSpanFactory(
        callWithRequest,
        callWithInternalUser,
        mockXpackMainPluginFactory()
      );

      estimateBucketSpan(formConfig).catch(catchData => {
        expect(catchData).to.be('Unable to retrieve cluster setting search.max_buckets');

        done();
      });
    }).to.not.throwError('Not initialized.');
  });

  it('call factory and estimator with security enabled and sufficient permissions.', done => {
    expect(function() {
      const estimateBucketSpan = estimateBucketSpanFactory(
        callWithRequest,
        callWithInternalUser,
        mockXpackMainPluginFactory(true)
      );
      estimateBucketSpan(formConfig).catch(catchData => {
        expect(catchData).to.be('Unable to retrieve cluster setting search.max_buckets');

        done();
      });
    }).to.not.throwError('Not initialized.');
  });

  it('call factory and estimator with security enabled and insufficient permissions.', done => {
    expect(function() {
      const estimateBucketSpan = estimateBucketSpanFactory(
        callWithRequest,
        callWithInternalUser,
        mockXpackMainPluginFactory(true)
      );

      estimateBucketSpan(formConfig).catch(catchData => {
        expect(catchData).to.be('Insufficient permissions to call bucket span estimation.');
        done();
      });
    }).to.not.throwError('Not initialized.');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { CancellationToken } from '../../../../../common/cancellation_token';

// FAILING: https://github.com/elastic/kibana/issues/51373
describe.skip('CancellationToken', function() {
  let cancellationToken;
  beforeEach(function() {
    cancellationToken = new CancellationToken();
  });

  describe('on', function() {
    [true, null, undefined, 1, 'string', {}, []].forEach(function(value) {
      it(`should throw an Error if value is ${value}`, function() {
        expect(cancellationToken.on)
          .withArgs(value)
          .to.throwError();
      });
    });

    it('accepts a function', function() {
      expect(cancellationToken.on)
        .withArgs(function() {})
        .not.to.throwError();
    });

    it(`calls function if cancel has previously been called`, function() {
      const spy = sinon.spy();
      cancellationToken.cancel();
      cancellationToken.on(spy);
      expect(spy.calledOnce).to.be(true);
    });
  });

  describe('cancel', function() {
    it('should be a function accepting no parameters', function() {
      expect(cancellationToken.cancel)
        .withArgs()
        .to.not.throwError();
    });

    it('should call a single callback', function() {
      const spy = sinon.spy();
      cancellationToken.on(spy);
      cancellationToken.cancel();
      expect(spy.calledOnce).to.be(true);
    });

    it('should call two callbacks', function() {
      const spy1 = sinon.spy();
      const spy2 = sinon.spy();
      cancellationToken.on(spy1);
      cancellationToken.on(spy2);
      cancellationToken.cancel();
      expect(spy1.calledOnce).to.be(true);
      expect(spy2.calledOnce).to.be(true);
    });
  });

  describe('isCancelled', function() {
    it('should default to false', function() {
      expect(cancellationToken.isCancelled).to.be(false);
    });

    it('should switch to true after call to cancel', function() {
      cancellationToken.cancel();
      expect(cancellationToken.isCancelled).to.be(true);
    });
  });
});

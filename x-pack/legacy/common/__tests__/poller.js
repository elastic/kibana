/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import sinon from 'sinon';
import { Poller } from '../poller';

describe('Poller', () => {

  const pollFrequencyInMillis = 20;
  let functionToPoll;
  let successFunction;
  let errorFunction;
  let poller;
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
    if (poller) {
      poller.stop();
    }
  });


  // Allowing the Poller to poll requires intimate knowledge of the inner workings of the Poller.
  // We have to ensure that the Promises internal to the `_poll` method are resolved to queue up
  // the next setTimeout before incrementing the clock. The order of this differs slightly when the
  // `trailing` is set, hence the different `allowPoll` and `allowDelayPoll` functions.
  const queueNextPoll = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  const allowPoll = async (interval) => {
    await queueNextPoll();
    clock.tick(interval);
  };

  const allowDelayPoll = async (interval) => {
    clock.tick(interval);
    await queueNextPoll();
  };

  describe('start()', () => {

    beforeEach(() => {
      functionToPoll = sinon.spy(() => { return Promise.resolve(42); });
      successFunction = sinon.spy();
      errorFunction = sinon.spy();
      poller = new Poller({
        functionToPoll,
        successFunction,
        errorFunction,
        pollFrequencyInMillis
      });
    });

    describe(`when trailing isn't set`, () => {
      it(`polls immediately`, () => {
        poller.start();
        expect(functionToPoll.callCount).to.be(1);
      });
    });

    describe(`when trailing is set to true`, () => {
      beforeEach(() => {
        poller = new Poller({
          functionToPoll,
          successFunction,
          errorFunction,
          pollFrequencyInMillis,
          trailing: true
        });
      });

      it('waits for pollFrequencyInMillis before polling', async () => {
        poller.start();
        expect(functionToPoll.callCount).to.be(0);
        allowDelayPoll(pollFrequencyInMillis);
        expect(functionToPoll.callCount).to.be(1);
      });
    });

    it ('polls the functionToPoll multiple times', async () => {
      poller.start();
      await allowPoll(pollFrequencyInMillis * 2);
      expect(functionToPoll.callCount).to.be.greaterThan(1);
    });

    describe('when the function to poll succeeds', () => {

      it ('calls the successFunction multiple times', async () => {
        poller.start();
        await allowPoll(pollFrequencyInMillis * 2);
        expect(successFunction.callCount).to.be.greaterThan(1);
        expect(errorFunction.callCount).to.be(0);
      });

    });

    describe('when the function to poll fails', () => {

      beforeEach(() => {
        functionToPoll = sinon.spy(() => { return Promise.reject(42); });
      });

      describe('when the continuePollingOnError option has not been set', () => {

        beforeEach(() => {
          poller = new Poller({
            functionToPoll,
            successFunction,
            errorFunction,
            pollFrequencyInMillis
          });
        });

        it ('calls the errorFunction exactly once and polling is stopped', async () => {
          poller.start();
          await allowPoll(pollFrequencyInMillis * 4);
          expect(poller.isRunning()).to.be(false);
          expect(successFunction.callCount).to.be(0);
          expect(errorFunction.callCount).to.be(1);
        });
      });

      describe('when the continuePollingOnError option has been set to true', () => {

        beforeEach(() => {
          poller = new Poller({
            functionToPoll,
            successFunction,
            errorFunction,
            pollFrequencyInMillis,
            continuePollingOnError: true
          });
        });

        it ('calls the errorFunction multiple times', async () => {
          poller.start();
          await allowPoll(pollFrequencyInMillis);
          await allowPoll(pollFrequencyInMillis);
          expect(successFunction.callCount).to.be(0);
          expect(errorFunction.callCount).to.be.greaterThan(1);
        });

        describe('when pollFrequencyErrorMultiplier has been set', () => {
          beforeEach(() => {
            poller = new Poller({
              functionToPoll,
              successFunction,
              errorFunction,
              pollFrequencyInMillis,
              continuePollingOnError: true,
              pollFrequencyErrorMultiplier: 2
            });
          });

          it('waits for the multiplier * the pollFrequency', async () => {
            poller.start();
            await queueNextPoll();
            expect(functionToPoll.callCount).to.be(1);
            await allowPoll(pollFrequencyInMillis);
            expect(functionToPoll.callCount).to.be(1);
            await allowPoll(pollFrequencyInMillis);
            expect(functionToPoll.callCount).to.be(2);
          });
        });
      });

    });
  });

  describe('isRunning()', () => {

    beforeEach(() => {
      functionToPoll = sinon.spy(() => { return Promise.resolve(42); });
      poller = new Poller({
        functionToPoll
      });
    });

    it('returns true immediately after invoking start()', () => {
      poller.start();
      expect(poller.isRunning()).to.be(true);
    });

    it('returns false after invoking stop', () => {
      poller.start();
      poller.stop();
      expect(poller.isRunning()).to.be(false);
    });
  });

  describe('stop()', () => {

    describe(`when successFunction isn't set`, () => {
      beforeEach(() => {
        functionToPoll = sinon.spy(() => { return Promise.resolve(42); });
        poller = new Poller({
          functionToPoll,
          pollFrequencyInMillis
        });
      });

      it(`doesn't poll again`, async () => {
        poller.start();
        expect(functionToPoll.callCount).to.be(1);
        poller.stop();
        await allowPoll(pollFrequencyInMillis);
        expect(functionToPoll.callCount).to.be(1);
      });
    });

    describe(`when successFunction is a Promise`, () => {
      beforeEach(() => {
        functionToPoll = sinon.spy(() => { return Promise.resolve(42); });
        poller = new Poller({
          functionToPoll,
          successFunction: Promise.resolve(),
          pollFrequencyInMillis
        });
      });

      it(`doesn't poll again when successFunction is a Promise`, async () => {
        poller.start();
        expect(functionToPoll.callCount).to.be(1);
        poller.stop();
        await allowPoll(pollFrequencyInMillis);
        expect(functionToPoll.callCount).to.be(1);
      });
    });
  });
});

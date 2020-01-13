/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import rison from 'rison-node';
import { parseKibanaState } from '../parse_kibana_state';

const stateIndices = {
  global: '_g',
  app: '_a',
};
const globalTime =
  '(refreshInterval:(display:Off,pause:!f,value:0),time:(from:now-15m,mode:quick,to:now))';

describe('Kibana state', function() {
  describe('type checking', function() {
    it('should throw if not given an object', function() {
      const fn = () => parseKibanaState('i am not an object', 'global');
      const fn2 = () => parseKibanaState(['arrays are not valid either'], 'global');
      expect(fn).to.throwException(/must be an object/i);
      expect(fn2).to.throwException(/must be an object/i);
    });

    it('should throw with invalid type', function() {
      const fn = () => parseKibanaState({}, 'this is an invalid state type');
      expect(fn).to.throwException(/unknown state type/i);
    });
  });

  describe('value of exists', function() {
    it('should be false if state does not exist', function() {
      const state = parseKibanaState({}, 'global');
      expect(state.exists).to.equal(false);
    });

    it('should be true if state exists', function() {
      const query = {};
      query[stateIndices.global] = rison.encode({ hello: 'world' });
      const state = parseKibanaState(query, 'global');
      expect(state.exists).to.equal(true);
    });
  });

  describe('instance methods', function() {
    let query;

    beforeEach(function() {
      query = {};
      query[stateIndices.global] = globalTime;
    });

    describe('get', function() {
      it('should return the value', function() {
        const state = parseKibanaState(query, 'global');
        const { refreshInterval } = rison.decode(globalTime);
        expect(state.get('refreshInterval')).to.eql(refreshInterval);
      });

      it('should use the default value for missing props', function() {
        const defaultValue = 'default value';
        const state = parseKibanaState(query, 'global');
        expect(state.get('no such value', defaultValue)).to.equal(defaultValue);
      });
    });

    describe('set', function() {
      it('should update the value of the state', function() {
        const state = parseKibanaState(query, 'global');
        expect(state.get('refreshInterval.pause')).to.equal(false);

        state.set(['refreshInterval', 'pause'], true);
        expect(state.get('refreshInterval.pause')).to.equal(true);
      });

      it('should create new properties', function() {
        const prop = 'newProp';
        const value = 12345;
        const state = parseKibanaState(query, 'global');
        expect(state.get(prop)).to.be(undefined);

        state.set(prop, value);
        expect(state.get(prop)).to.not.be(undefined);
        expect(state.get(prop)).to.equal(value);
      });
    });

    describe('removing properties', function() {
      it('should remove a single value', function() {
        const state = parseKibanaState(query, 'global');
        expect(state.get('refreshInterval')).to.be.an('object');

        state.removeProps('refreshInterval');
        expect(state.get('refreshInterval')).to.be(undefined);
      });

      it('should remove multiple values', function() {
        const state = parseKibanaState(query, 'global');
        expect(state.get('refreshInterval')).to.be.an('object');
        expect(state.get('time')).to.be.an('object');

        state.removeProps(['refreshInterval', 'time']);
        expect(state.get('refreshInterval')).to.be(undefined);
        expect(state.get('time')).to.be(undefined);
      });
    });

    describe('toString', function() {
      it('should rison encode the state', function() {
        const state = parseKibanaState(query, 'global');
        expect(state.toString()).to.equal(globalTime);
      });
    });

    describe('toQuery', function() {
      it('should return an object', function() {
        const state = parseKibanaState(query, 'global');
        expect(state.toQuery()).to.be.an('object');
      });

      it('should contain the kibana state property', function() {
        const state = parseKibanaState(query, 'global');
        expect(state.toQuery()).to.have.property(stateIndices.global, globalTime);
      });
    });
  });
});

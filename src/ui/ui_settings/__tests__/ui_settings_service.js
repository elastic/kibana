import { isEqual } from 'lodash';
import expect from 'expect.js';
import { errors as esErrors } from 'elasticsearch';

import { getDefaultSettings } from '../defaults';
import { UiSettingsService } from '../ui_settings_service';

import {
  assertPromise,
  assertRejection,
  createCallClusterStub,
} from './lib';

const INDEX = '.kibana';
const TYPE = 'config';
const ID = 'kibana-version';

function setup(options = {}) {
  const {
    readInterceptor,
    esDocSource = {},
    callCluster = createCallClusterStub(INDEX, TYPE, ID, esDocSource)
  } = options;

  const uiSettings = new UiSettingsService({
    index: INDEX,
    type: TYPE,
    id: ID,
    readInterceptor,
    callCluster,
  });

  return {
    uiSettings,
    assertGetQuery: callCluster.assertGetQuery,
    assertUpdateQuery: callCluster.assertUpdateQuery,
  };
}

describe('ui settings', function () {
  describe('overview', function () {
    it('has expected api surface', function () {
      const { uiSettings } = setup();
      expect(typeof uiSettings.get).to.equal('function');
      expect(typeof uiSettings.getAll).to.equal('function');
      expect(typeof uiSettings.getDefaults).to.equal('function');
      expect(typeof uiSettings.getRaw).to.equal('function');
      expect(typeof uiSettings.getUserProvided).to.equal('function');
      expect(typeof uiSettings.remove).to.equal('function');
      expect(typeof uiSettings.removeMany).to.equal('function');
      expect(typeof uiSettings.set).to.equal('function');
      expect(typeof uiSettings.setMany).to.equal('function');
    });

    it('throws if the first error is not a request', async () => {
      const { uiSettings } = setup();
      await assertRejection(uiSettings.get(null), 'hapi.Request');
      await assertRejection(uiSettings.get(false), 'hapi.Request');
      await assertRejection(uiSettings.get('key'), 'hapi.Request');
      await assertRejection(uiSettings.get(/regex/), 'hapi.Request');
      await assertRejection(uiSettings.get(new Date()), 'hapi.Request');
      await assertRejection(uiSettings.get({}), 'hapi.Request');
      await assertRejection(uiSettings.get({ path:'' }), 'hapi.Request');
      await assertRejection(uiSettings.get({ path:'', headers:null }), 'hapi.Request');
      await assertRejection(uiSettings.get({ headers:{} }), 'hapi.Request');
    });
  });

  describe('#setMany()', function () {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      assertPromise(uiSettings.setMany({ a: 'b' }));
    });

    it('updates a single value in one operation', async function () {
      const { uiSettings, assertUpdateQuery } = setup();
      await uiSettings.setMany({ one: 'value' });
      assertUpdateQuery({ one: 'value' });
    });

    it('updates several values in one operation', async function () {
      const { uiSettings, assertUpdateQuery } = setup();
      await uiSettings.setMany({ one: 'value', another: 'val' });
      assertUpdateQuery({ one: 'value', another: 'val' });
    });
  });

  describe('#set()', function () {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      assertPromise(uiSettings.set('a', 'b'));
    });

    it('updates single values by (key, value)', async function () {
      const { uiSettings, assertUpdateQuery } = setup();
      await uiSettings.set('one', 'value');
      assertUpdateQuery({ one: 'value' });
    });
  });

  describe('#remove()', function () {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      assertPromise(uiSettings.remove('one'));
    });

    it('removes single values by key', async function () {
      const { uiSettings, assertUpdateQuery } = setup();
      await uiSettings.remove('one');
      assertUpdateQuery({ one: null });
    });
  });

  describe('#removeMany()', function () {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      assertPromise(uiSettings.removeMany(['one']));
    });

    it('removes a single value', async function () {
      const { uiSettings, assertUpdateQuery } = setup();
      await uiSettings.removeMany(['one']);
      assertUpdateQuery({ one: null });
    });

    it('updates several values in one operation', async function () {
      const { uiSettings, assertUpdateQuery } = setup();
      await uiSettings.removeMany(['one', 'two', 'three']);
      assertUpdateQuery({ one: null, two: null, three: null });
    });
  });

  describe('#getDefaults()', function () {
    it('is promised the default values', async function () {
      const {
        uiSettings
      } = setup();
      const defaults = await uiSettings.getDefaults();
      expect(isEqual(defaults, getDefaultSettings())).to.equal(true);
    });


    describe('defaults for formatters', async function () {

      const defaults = getDefaultSettings();
      const mapping = JSON.parse(defaults['format:defaultTypeMap'].value);
      const expected = {
        ip: { id: 'ip', params: {} },
        date: { id: 'date', params: {} },
        number: { id: 'number', params: {} },
        boolean: { id: 'boolean', params: {} },
        _source: { id: '_source', params: {} },
        _default_: { id: 'string', params: {} }
      };

      Object.keys(mapping).forEach(function (dataType) {
        it(`should configure ${dataType}`, function () {
          expect(expected.hasOwnProperty(dataType)).to.equal(true);
          expect(mapping[dataType].id).to.equal(expected[dataType].id);
          expect(JSON.stringify(mapping[dataType].params)).to.equal(JSON.stringify(expected[dataType].params));
        });
      });
    });
  });

  describe('#getUserProvided()', function () {
    it('pulls user configuration from ES', async function () {
      const { uiSettings, assertGetQuery } = setup();
      await uiSettings.getUserProvided();
      assertGetQuery();
    });

    it('returns user configuration', async function () {
      const esDocSource = { user: 'customized' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.getUserProvided();
      expect(isEqual(result, {
        user: { userValue: 'customized' }
      })).to.equal(true);
    });

    it('ignores null user configuration (because default values)', async function () {
      const esDocSource = { user: 'customized', usingDefault: null, something: 'else' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.getUserProvided();
      expect(isEqual(result, {
        user: { userValue: 'customized' }, something: { userValue: 'else' }
      })).to.equal(true);
    });

    it('returns an empty object on 404 responses', async function () {
      const { uiSettings } = setup({
        async callCluster() {
          throw new esErrors[404]();
        }
      });

      expect(await uiSettings.getUserProvided()).to.eql({});
    });

    it('returns an empty object on 403 responses', async function () {
      const { uiSettings } = setup({
        async callCluster() {
          throw new esErrors[403]();
        }
      });

      expect(await uiSettings.getUserProvided()).to.eql({});
    });

    it('returns an empty object on NoConnections responses', async function () {
      const { uiSettings } = setup({
        async callCluster() {
          throw new esErrors.NoConnections();
        }
      });

      expect(await uiSettings.getUserProvided()).to.eql({});
    });

    it('throws 401 errors', async function () {
      const { uiSettings } = setup({
        async callCluster() {
          throw new esErrors[401]();
        }
      });

      try {
        await uiSettings.getUserProvided();
        throw new Error('expect getUserProvided() to throw');
      } catch (err) {
        expect(err).to.be.a(esErrors[401]);
      }
    });

    it('throw when callCluster fails in some unexpected way', async function () {
      const expectedUnexpectedError = new Error('unexpected');

      const { uiSettings } = setup({
        async callCluster() {
          throw expectedUnexpectedError;
        }
      });

      try {
        await uiSettings.getUserProvided();
        throw new Error('expect getUserProvided() to throw');
      } catch (err) {
        expect(err).to.be(expectedUnexpectedError);
      }
    });
  });

  describe('#getRaw()', function () {
    it('pulls user configuration from ES', async function () {
      const esDocSource = {};
      const { uiSettings, assertGetQuery } = setup({ esDocSource });
      await uiSettings.getRaw();
      assertGetQuery();
    });

    it(`without user configuration it's equal to the defaults`, async function () {
      const esDocSource = {};
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.getRaw();
      expect(isEqual(result, getDefaultSettings())).to.equal(true);
    });

    it(`user configuration gets merged with defaults`, async function () {
      const esDocSource = { foo: 'bar' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.getRaw();
      const merged = getDefaultSettings();
      merged.foo = { userValue: 'bar' };
      expect(isEqual(result, merged)).to.equal(true);
    });

    it(`user configuration gets merged into defaults`, async function () {
      const esDocSource = { dateFormat: 'YYYY-MM-DD' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.getRaw();
      const merged = getDefaultSettings();
      merged.dateFormat.userValue = 'YYYY-MM-DD';
      expect(isEqual(result, merged)).to.equal(true);
    });
  });

  describe('#getAll()', function () {
    it('pulls user configuration from ES', async function () {
      const esDocSource = {};
      const { uiSettings, assertGetQuery } = setup({ esDocSource });
      await uiSettings.getAll();
      assertGetQuery();
    });

    it(`returns key value pairs`, async function () {
      const esDocSource = {};
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.getAll();
      const defaults = getDefaultSettings();
      const expectation = {};
      Object.keys(defaults).forEach(key => {
        expectation[key] = defaults[key].value;
      });
      expect(isEqual(result, expectation)).to.equal(true);
    });

    it(`returns key value pairs including user configuration`, async function () {
      const esDocSource = { something: 'user-provided' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.getAll();
      const defaults = getDefaultSettings();
      const expectation = {};
      Object.keys(defaults).forEach(key => {
        expectation[key] = defaults[key].value;
      });
      expectation.something = 'user-provided';
      expect(isEqual(result, expectation)).to.equal(true);
    });

    it(`returns key value pairs including user configuration for existing settings`, async function () {
      const esDocSource = { dateFormat: 'YYYY-MM-DD' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.getAll();
      const defaults = getDefaultSettings();
      const expectation = {};
      Object.keys(defaults).forEach(key => {
        expectation[key] = defaults[key].value;
      });
      expectation.dateFormat = 'YYYY-MM-DD';
      expect(isEqual(result, expectation)).to.equal(true);
    });
  });

  describe('#get()', function () {
    it('pulls user configuration from ES', async function () {
      const esDocSource = {};
      const { uiSettings, assertGetQuery } = setup({ esDocSource });
      await uiSettings.get();
      assertGetQuery();
    });

    it(`returns the promised value for a key`, async function () {
      const esDocSource = {};
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.get('dateFormat');
      const defaults = getDefaultSettings();
      expect(result).to.equal(defaults.dateFormat.value);
    });

    it(`returns the user-configured value for a custom key`, async function () {
      const esDocSource = { custom: 'value' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.get('custom');
      expect(result).to.equal('value');
    });

    it(`returns the user-configured value for a modified key`, async function () {
      const esDocSource = { dateFormat: 'YYYY-MM-DD' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.get('dateFormat');
      expect(result).to.equal('YYYY-MM-DD');
    });
  });

  describe('readInterceptor() argument', () => {
    describe('#getUserProvided()', () => {
      it('returns a promise when interceptValue doesn\'t', () => {
        const { uiSettings } = setup({ readInterceptor: () => ({}) });
        assertPromise(uiSettings.getUserProvided());
      });

      it('returns intercept values', async () => {
        const { uiSettings } = setup({
          readInterceptor: () => ({
            foo: 'bar'
          })
        });

        expect(await uiSettings.getUserProvided()).to.eql({
          foo: {
            userValue: 'bar'
          }
        });
      });
    });

    describe('#getAll()', () => {
      it('merges intercept value with defaults', async () => {
        const { uiSettings } = setup({
          readInterceptor: () => ({
            foo: 'not foo'
          }),
        });

        const defaults = getDefaultSettings();
        const defaultValues = Object.keys(defaults).reduce((acc, key) => ({
          ...acc,
          [key]: defaults[key].value,
        }), {});

        expect(await uiSettings.getAll()).to.eql({
          ...defaultValues,
          foo: 'not foo',
        });
      });
    });
  });

});

import { isEqual } from 'lodash';
import expect from 'expect.js';
import { errors as esErrors } from 'elasticsearch';
import Chance from 'chance';

import { UiSettingsService } from '../ui_settings_service';

import {
  createObjectsClientStub,
  savedObjectsClientErrors,
} from './lib';

const TYPE = 'config';
const ID = 'kibana-version';
const chance = new Chance();

function setup(options = {}) {
  const {
    readInterceptor,
    getDefaults,
    defaults = {},
    esDocSource = {},
    savedObjectsClient = createObjectsClientStub(TYPE, ID, esDocSource)
  } = options;

  const uiSettings = new UiSettingsService({
    type: TYPE,
    id: ID,
    getDefaults: getDefaults || (() => defaults),
    readInterceptor,
    savedObjectsClient,
  });

  return {
    uiSettings,
    assertGetQuery: savedObjectsClient.assertGetQuery,
    assertUpdateQuery: savedObjectsClient.assertUpdateQuery,
  };
}

describe('ui settings', () => {
  describe('overview', () => {
    it('has expected api surface', () => {
      const { uiSettings } = setup();
      expect(uiSettings).to.have.property('get').a('function');
      expect(uiSettings).to.have.property('getAll').a('function');
      expect(uiSettings).to.have.property('getDefaults').a('function');
      expect(uiSettings).to.have.property('getRaw').a('function');
      expect(uiSettings).to.have.property('getUserProvided').a('function');
      expect(uiSettings).to.have.property('remove').a('function');
      expect(uiSettings).to.have.property('removeMany').a('function');
      expect(uiSettings).to.have.property('set').a('function');
      expect(uiSettings).to.have.property('setMany').a('function');
    });
  });

  describe('#setMany()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.setMany({ a: 'b' })).to.be.a(Promise);
    });

    it('updates a single value in one operation', async () => {
      const { uiSettings, assertUpdateQuery } = setup();
      await uiSettings.setMany({ one: 'value' });
      assertUpdateQuery({ one: 'value' });
    });

    it('updates several values in one operation', async () => {
      const { uiSettings, assertUpdateQuery } = setup();
      await uiSettings.setMany({ one: 'value', another: 'val' });
      assertUpdateQuery({ one: 'value', another: 'val' });
    });
  });

  describe('#set()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.set('a', 'b')).to.be.a(Promise);
    });

    it('updates single values by (key, value)', async () => {
      const { uiSettings, assertUpdateQuery } = setup();
      await uiSettings.set('one', 'value');
      assertUpdateQuery({ one: 'value' });
    });
  });

  describe('#remove()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.remove('one')).to.be.a(Promise);
    });

    it('removes single values by key', async () => {
      const { uiSettings, assertUpdateQuery } = setup();
      await uiSettings.remove('one');
      assertUpdateQuery({ one: null });
    });
  });

  describe('#removeMany()', () => {
    it('returns a promise', () => {
      const { uiSettings } = setup();
      expect(uiSettings.removeMany(['one'])).to.be.a(Promise);
    });

    it('removes a single value', async () => {
      const { uiSettings, assertUpdateQuery } = setup();
      await uiSettings.removeMany(['one']);
      assertUpdateQuery({ one: null });
    });

    it('updates several values in one operation', async () => {
      const { uiSettings, assertUpdateQuery } = setup();
      await uiSettings.removeMany(['one', 'two', 'three']);
      assertUpdateQuery({ one: null, two: null, three: null });
    });
  });

  describe('#getDefaults()', () => {
    it('returns a promise for the defaults', async () => {
      const { uiSettings } = setup();
      const promise = uiSettings.getDefaults();
      expect(promise).to.be.a(Promise);
      expect(await promise).to.eql({});
    });
  });

  describe('getDefaults() argument', () => {
    it('casts sync `getDefaults()` to promise', () => {
      const getDefaults = () => ({ key: { value: chance.word() } });
      const { uiSettings } = setup({ getDefaults });
      expect(uiSettings.getDefaults()).to.be.a(Promise);
    });

    it('returns the defaults returned by getDefaults() argument', async () => {
      const value = chance.word();
      const { uiSettings } = setup({ defaults: { key: { value } } });
      expect(await uiSettings.getDefaults()).to.eql({
        key: { value }
      });
    });
  });

  describe('#getUserProvided()', () => {
    it('pulls user configuration from ES', async () => {
      const { uiSettings, assertGetQuery } = setup();
      await uiSettings.getUserProvided();
      assertGetQuery();
    });

    it('returns user configuration', async () => {
      const esDocSource = { user: 'customized' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.getUserProvided();
      expect(isEqual(result, {
        user: { userValue: 'customized' }
      })).to.equal(true);
    });

    it('ignores null user configuration (because default values)', async () => {
      const esDocSource = { user: 'customized', usingDefault: null, something: 'else' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.getUserProvided();
      expect(isEqual(result, {
        user: { userValue: 'customized' }, something: { userValue: 'else' }
      })).to.equal(true);
    });

    it('returns an empty object on 404 responses', async () => {
      const { uiSettings } = setup({
        async callCluster() {
          throw new esErrors[404]();
        }
      });

      expect(await uiSettings.getUserProvided()).to.eql({});
    });

    it('returns an empty object on 403 responses', async () => {
      const { uiSettings } = setup({
        async callCluster() {
          throw new esErrors[403]();
        }
      });

      expect(await uiSettings.getUserProvided()).to.eql({});
    });

    it('returns an empty object on NoConnections responses', async () => {
      const { uiSettings } = setup({
        async callCluster() {
          throw new esErrors.NoConnections();
        }
      });

      expect(await uiSettings.getUserProvided()).to.eql({});
    });

    it('throws 401 errors', async () => {
      const { uiSettings } = setup({
        savedObjectsClient: {
          errors: savedObjectsClientErrors,
          async get() {
            throw new esErrors[401]();
          }
        }
      });

      try {
        await uiSettings.getUserProvided();
        throw new Error('expect getUserProvided() to throw');
      } catch (err) {
        expect(err).to.be.a(esErrors[401]);
      }
    });

    it('throw when callCluster fails in some unexpected way', async () => {
      const expectedUnexpectedError = new Error('unexpected');

      const { uiSettings } = setup({
        savedObjectsClient: {
          errors: savedObjectsClientErrors,
          async get() {
            throw expectedUnexpectedError;
          }
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

  describe('#getRaw()', () => {
    it('pulls user configuration from ES', async () => {
      const esDocSource = {};
      const { uiSettings, assertGetQuery } = setup({ esDocSource });
      await uiSettings.getRaw();
      assertGetQuery();
    });

    it(`without user configuration it's equal to the defaults`, async () => {
      const esDocSource = {};
      const defaults = { key: { value: chance.word() } };
      const { uiSettings } = setup({ esDocSource, defaults });
      const result = await uiSettings.getRaw();
      expect(result).to.eql(defaults);
    });

    it(`user configuration gets merged with defaults`, async () => {
      const esDocSource = { foo: 'bar' };
      const defaults = { key: { value: chance.word() } };
      const { uiSettings } = setup({ esDocSource, defaults });
      const result = await uiSettings.getRaw();

      expect(result).to.eql({
        foo: {
          userValue: 'bar',
        },
        key: {
          value: defaults.key.value,
        },
      });
    });
  });

  describe('#getAll()', () => {
    it('pulls user configuration from ES', async () => {
      const esDocSource = {};
      const { uiSettings, assertGetQuery } = setup({ esDocSource });
      await uiSettings.getAll();
      assertGetQuery();
    });

    it(`returns defaults when es doc is empty`, async () => {
      const esDocSource = { };
      const defaults = { foo: { value: 'bar' } };
      const { uiSettings } = setup({ esDocSource, defaults });
      expect(await uiSettings.getAll()).to.eql({
        foo: 'bar'
      });
    });

    it(`merges user values, including ones without defaults, into key value pairs`, async () => {
      const esDocSource = {
        foo: 'user-override',
        bar: 'user-provided',
      };

      const defaults = {
        foo: {
          value: 'default'
        },
      };

      const { uiSettings } = setup({ esDocSource, defaults });
      expect(await uiSettings.getAll()).to.eql({
        foo: 'user-override',
        bar: 'user-provided',
      });
    });
  });

  describe('#get()', () => {
    it('pulls user configuration from ES', async () => {
      const esDocSource = {};
      const { uiSettings, assertGetQuery } = setup({ esDocSource });
      await uiSettings.get();
      assertGetQuery();
    });

    it(`returns the promised value for a key`, async () => {
      const esDocSource = {};
      const defaults = { dateFormat: { value: chance.word() } };
      const { uiSettings } = setup({ esDocSource, defaults });
      const result = await uiSettings.get('dateFormat');
      expect(result).to.equal(defaults.dateFormat.value);
    });

    it(`returns the user-configured value for a custom key`, async () => {
      const esDocSource = { custom: 'value' };
      const { uiSettings } = setup({ esDocSource });
      const result = await uiSettings.get('custom');
      expect(result).to.equal('value');
    });

    it(`returns the user-configured value for a modified key`, async () => {
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
        expect(uiSettings.getUserProvided()).to.be.a(Promise);
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
          defaults: {
            foo: { value: 'foo' },
            bar: { value: 'bar' },
          },

          readInterceptor: () => ({
            foo: 'not foo'
          }),
        });

        expect(await uiSettings.getAll()).to.eql({
          foo: 'not foo',
          bar: 'bar'
        });
      });
    });
  });
});

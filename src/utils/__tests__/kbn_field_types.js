import expect from 'expect.js';
import Chance from 'chance';

const chance = new Chance();
import {
  KbnFieldType,
  getKbnFieldType,
  castEsToKbnFieldTypeName,
  castEsToKbnFieldType,
  getEsTypes
} from '../kbn_field_types';

describe('utils/kbn_field_types', () => {
  describe('getKbnFieldType()', () => {
    it('returns a KbnFieldType instance by name', () => {
      expect(getKbnFieldType('string')).to.be.a(KbnFieldType);
    });

    it('returns undefined for invalid name', () => {
      expect(getKbnFieldType(chance.sentence())).to.be(undefined);
    });
  });

  describe('castEsToKbnFieldTypeName()', () => {
    it('returns the kbnFieldType name that matches the esType', () => {
      expect(castEsToKbnFieldTypeName('keyword')).to.be('string');
      expect(castEsToKbnFieldTypeName('float')).to.be('number');
    });

    it('returns unknown for unknown es types', () => {
      expect(castEsToKbnFieldTypeName(chance.sentence())).to.be('unknown');
    });
  });

  describe('castEsToKbnFieldType()', () => {
    it('returns the kbnFieldType instance that matches the esType', () => {
      expect(castEsToKbnFieldType('keyword')).to.be(getKbnFieldType('string'));
    });

    it('returns the unknown field type for unknown es types', () => {
      expect(castEsToKbnFieldType(chance.sentence())).to.be(getKbnFieldType('unknown'));
    });
  });

  describe('getEsTypes()', () => {
    it('returns a list of all esTypes known in kibana types', () => {
      const esTypes = getEsTypes();
      expect(esTypes).to.contain('keyword');
      expect(esTypes).to.contain('float');
      expect(esTypes).to.contain('geo_point');
    });
  });
});

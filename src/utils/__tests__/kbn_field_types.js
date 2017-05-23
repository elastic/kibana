import expect from 'expect.js';
import Chance from 'chance';

const chance = new Chance();
import {
  KbnFieldType,
  getKbnFieldType,
  castEsToKbnFieldTypeName,
  getKbnTypeNames
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

  describe('getKbnTypeNames()', () => {
    it('returns a list of all kbnFieldType names', () => {
      const esTypes = getKbnTypeNames();
      expect(esTypes).to.contain('string');
      expect(esTypes).to.contain('number');
      expect(esTypes).to.contain('geo_point');
      expect(esTypes).to.not.contain('keyword');
      expect(esTypes).to.not.contain('float');
    });
  });
});

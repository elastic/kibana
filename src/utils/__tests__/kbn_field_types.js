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
  describe('KbnFieldType', () => {
    it('defaults', () => {
      expect(new KbnFieldType())
        .to.have.property('name', undefined)
        .and.have.property('sortable', false)
        .and.have.property('filterable', false)
        .and.have.property('esTypes').eql([]);
    });

    it('assigns name, sortable, filterable, and esTypes options to itself', () => {
      const name = chance.word();
      const sortable = chance.bool();
      const filterable = chance.bool();
      const esTypes = chance.n(chance.word, 3);

      expect(new KbnFieldType({ name, sortable, filterable, esTypes }))
        .to.have.property('name', name)
        .and.have.property('sortable', sortable)
        .and.have.property('filterable', filterable)
        .and.have.property('esTypes').eql(esTypes);
    });

    it('prevents modification', () => {
      const type = new KbnFieldType();
      expect(() => type.name = null).to.throwError();
      expect(() => type.sortable = null).to.throwError();
      expect(() => type.filterable = null).to.throwError();
      expect(() => type.esTypes = null).to.throwError();
      expect(() => type.esTypes.push(null)).to.throwError();
    });

    it('allows extension', () => {
      const type = new KbnFieldType();
      type.$hashKey = '123';
      expect(type).to.have.property('$hashKey', '123');
    });
  });

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
      expect(getKbnTypeNames().sort()).to.eql([
        '_source',
        'attachment',
        'boolean',
        'conflict',
        'date',
        'geo_point',
        'geo_shape',
        'ip',
        'murmur3',
        'number',
        'string',
        'unknown',
      ]);
    });
  });
});

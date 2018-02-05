import { getFieldsByWildcard } from '../../utils/get_fields_by_wildcard';
import expect from 'expect.js';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';

let indexPattern;

describe('getFieldsByWildcard', function () {

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    indexPattern = Private(StubbedLogstashIndexPatternProvider);
  }));

  describe('field names without a wildcard', function () {

    it('should thrown an error if the field does not exist in the index pattern', function () {
      expect(getFieldsByWildcard).withArgs('nonExistentField', indexPattern).to.throwException(
        /Field nonExistentField does not exist in index pattern logstash-\*/
      );
    });

    it('should return the single matching field in an array', function () {
      const results = getFieldsByWildcard('extension', indexPattern);
      expect(results).to.be.an('array');
      expect(results).to.have.length(1);
      expect(results[0].name).to.be('extension');
    });

  });

  describe('field name patterns with a wildcard', function () {

    it('should thrown an error if the pattern does not match any fields in the index pattern', function () {
      expect(getFieldsByWildcard).withArgs('nonExistent*', indexPattern).to.throwException(
        /No fields match the pattern nonExistent\* in index pattern logstash-\*/
      );
    });

    it('should return all fields that match the pattern in an array', function () {
      const results = getFieldsByWildcard('machine*', indexPattern);
      expect(results).to.be.an('array');
      expect(results).to.have.length(2);
      expect(results.find((field) => { return field.name === 'machine.os'; })).to.be.ok();
      expect(results.find((field) => { return field.name === 'machine.os.raw'; })).to.be.ok();
    });

    // * is a valid character in ES field names
    it('should allow wildcards to be escaped with a backslash', function () {
      const indexPatternWithWildField = {
        title: 'wildIndex',
        fields: [
          {
            name: 'foo*'
          }
        ]
      };

      const results = getFieldsByWildcard('foo\\*', indexPatternWithWildField);
      expect(results).to.be.an('array');
      expect(results).to.have.length(1);
      expect(results[0].name).to.be('foo*');

      // ensure the wildcard is actually being escaped
      expect(getFieldsByWildcard).withArgs('fo\\*', indexPatternWithWildField).to.throwException(
        /No fields match the pattern fo\\\* in index pattern wildIndex/
      );
    });

  });
});

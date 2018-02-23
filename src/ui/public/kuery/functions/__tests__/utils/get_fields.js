import { getFields } from '../../utils/get_fields';
import expect from 'expect.js';
import StubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';
import ngMock from 'ng_mock';
import { nodeTypes } from 'ui/kuery';

let indexPattern;

describe('getFields', function () {

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    indexPattern = Private(StubbedLogstashIndexPatternProvider);
  }));

  describe('field names without a wildcard', function () {

    it('should thrown an error if the field does not exist in the index pattern', function () {
      const fieldNameNode = nodeTypes.literal.buildNode('nonExistentField');
      expect(getFields).withArgs(fieldNameNode, indexPattern).to.throwException(
        /Field nonExistentField does not exist in index pattern logstash-\*/
      );
    });

    it('should return the single matching field in an array', function () {
      const fieldNameNode = nodeTypes.literal.buildNode('extension');
      const results = getFields(fieldNameNode, indexPattern);
      expect(results).to.be.an('array');
      expect(results).to.have.length(1);
      expect(results[0].name).to.be('extension');
    });

    it('should not match a wildcard in a literal node', function () {
      const indexPatternWithWildField = {
        title: 'wildIndex',
        fields: {
          byName: {
            'foo*': {
              name: 'foo*'
            }
          }
        }
      };

      const fieldNameNode = nodeTypes.literal.buildNode('foo*');
      const results = getFields(fieldNameNode, indexPatternWithWildField);
      expect(results).to.be.an('array');
      expect(results).to.have.length(1);
      expect(results[0].name).to.be('foo*');

      // ensure the wildcard is not actually being parsed
      expect(getFields).withArgs(nodeTypes.literal.buildNode('fo*'), indexPatternWithWildField).to.throwException(
        /Field fo\* does not exist in index pattern wildIndex/
      );

    });
  });

  describe('field name patterns with a wildcard', function () {

    it('should thrown an error if the pattern does not match any fields in the index pattern', function () {
      const fieldNameNode = nodeTypes.wildcard.buildNode('nonExistent*');
      expect(getFields).withArgs(fieldNameNode, indexPattern).to.throwException(
        /No fields match the pattern nonExistent\* in index pattern logstash-\*/
      );
    });

    it('should return all fields that match the pattern in an array', function () {
      const fieldNameNode = nodeTypes.wildcard.buildNode('machine*');
      const results = getFields(fieldNameNode, indexPattern);
      expect(results).to.be.an('array');
      expect(results).to.have.length(2);
      expect(results.find((field) => {
        return field.name === 'machine.os';
      })).to.be.ok();
      expect(results.find((field) => {
        return field.name === 'machine.os.raw';
      })).to.be.ok();
    });
  });
});

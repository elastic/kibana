import ngMock from 'ng_mock';
import expect from 'expect.js';
import sinon from 'sinon';
import { IndexPatternProvider } from '../_index_pattern';
import { IndexPatternsProvider } from '../index_patterns';

describe('IndexPatterns service', function () {
  let indexPatterns;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    const IndexPattern = Private(IndexPatternProvider);
    indexPatterns = Private(IndexPatternsProvider);

    // prevent IndexPattern initialization from doing anything
    Private.stub(
      IndexPatternProvider,
      function (...args) {
        const indexPattern = new IndexPattern(...args);
        sinon.stub(indexPattern, 'init', function () {
          return new Promise();
        });
        return indexPattern;
      }
    );
  }));

  it('does not cache gets without an id', function () {
    expect(indexPatterns.get()).to.not.be(indexPatterns.get());
  });

  it('does cache gets for the same id', function () {
    expect(indexPatterns.get(1)).to.be(indexPatterns.get(1));
  });
});

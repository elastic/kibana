import ngMock from 'ngMock';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';

describe('IndexPatterns service', function () {
  let indexPatterns;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    const IndexPattern = Private(require('../_index_pattern'));
    indexPatterns = Private(require('../index_patterns'));

    // prevent IndexPattern initialization from doing anything
    Private.stub(
      require('../_index_pattern'),
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

import expect from 'expect.js';
import { IndexPatternsPatternToWildcardProvider } from 'ui/index_patterns/_pattern_to_wildcard';
import ngMock from 'ng_mock';

describe('Index pattern to wildcard', function () {
  let indexPatternToWildcard;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (Private) {
    indexPatternToWildcard = Private(IndexPatternsPatternToWildcardProvider);
  }));

  it('should be a function', function () {
    expect(indexPatternToWildcard).to.be.a(Function);
  });

  it('should parse patterns with a single escaped sequence', function () {
    expect(indexPatternToWildcard('[foo-]YYYY')).to.equal('foo-*');
  });

  it('should parse patterns with a multiple escaped sequences', function () {
    expect(indexPatternToWildcard('[foo-]YYYY[-bar]')).to.equal('foo-*-bar');
    expect(indexPatternToWildcard('[foo-]YYYY[-bar-]MM')).to.equal('foo-*-bar-*');
  });

  it('should handle leading patterns', function () {
    expect(indexPatternToWildcard('YYYY[-foo]')).to.equal('*-foo');
  });

  it('should ignore [ when inside an escape', function () {
    expect(indexPatternToWildcard('[f[oo-]YYYY')).to.equal('f[oo-*');
  });

  // Not sure if this behavior is useful, but this is how the code works
  it('should add ] to the string when outside the pattern', function () {
    expect(indexPatternToWildcard('[foo-]]YYYY')).to.equal('foo-]*');
  });

  it('should ignore ] when outside an escape', function () {
    expect(indexPatternToWildcard('[f]oo-]YYYY')).to.equal('f*');
  });
});

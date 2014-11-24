define(function (require) {
  return ['Index pattern to wildcard', function () {

    var fn = require('components/index_patterns/_pattern_to_wildcard')();


    it('should be a function', function () {
      expect(fn).to.be.a(Function);
    });

    it('should parse patterns with a single escaped sequence', function () {
      expect(fn('[foo-]YYYY')).to.equal('foo-*');
    });

    it('should parse patterns with a multiple escaped sequences', function () {
      expect(fn('[foo-]YYYY[-bar]')).to.equal('foo-*-bar');
      expect(fn('[foo-]YYYY[-bar-]MM')).to.equal('foo-*-bar-*');
    });

    it('should handle leading patterns', function () {
      expect(fn('YYYY[-foo]')).to.equal('*-foo');
    });

    it('should ignore [ when inside an escape', function () {
      expect(fn('[f[oo-]YYYY')).to.equal('f[oo-*');
    });

    // Not sure if this behavior is useful, but this is how the code works
    it('should add ] to the string when outside the pattern', function () {
      expect(fn('[foo-]]YYYY')).to.equal('foo-]*');
    });

    it('should ignore ] when outside an escape', function () {
      expect(fn('[f]oo-]YYYY')).to.equal('f*');
    });
  }];
});
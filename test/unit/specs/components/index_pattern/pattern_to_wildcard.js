define(function (require) {

  var fn = require('components/index_patterns/_pattern_to_wildcard')();

  describe('patternToWildard function', function () {

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

    it('should ignore ] when outside an escape', function () {
      expect(fn('[f]oo-]YYYY')).to.equal('f*');
    });

  });

});

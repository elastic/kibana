define(function (require) {
  require('components/comma_list_filter');

  describe('Comma-List filter', function () {

    var commaList;

    beforeEach(module('kibana'));
    beforeEach(inject(function ($injector) {
      commaList = $injector.get('commaListFilter');
    }));

    it('converts a string to a pretty list', function () {
      expect(commaList('john,jaine,jim', true)).to.be('john, jaine and jim');
      expect(commaList('john,jaine,jim', false)).to.be('john, jaine or jim');
    });

    it('can accept an array too', function () {
      expect(commaList(['john', 'jaine', 'jim'])).to.be('john, jaine or jim');
    });

    it('handles undefined ok', function () {
      expect(commaList()).to.be('');
    });

    it('handls single values ok', function () {
      expect(commaList(['john'])).to.be('john');
    });

  });

});

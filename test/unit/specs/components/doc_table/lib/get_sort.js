define(function (require) {
  var getSort = require('components/doc_table/lib/get_sort');
  var indexPattern =
  describe('docTable', function () {
    describe('getSort function', function () {

      var timePattern = {
        timeFieldName: 'time'
      };
      var noTimePattern = {};

      it('should be a function', function () {
        expect(getSort).to.be.a(Function);
      });

      it('should return an object if passed a 2 item array', function () {
        expect(getSort(['foo', 'bar'], timePattern)).to.eql({foo: 'bar'});
        expect(getSort(['foo', 'bar'], noTimePattern)).to.eql({foo: 'bar'});
      });

      it('should sort in reverse chrono order otherwise on time based patterns', function () {
        expect(getSort([], timePattern)).to.eql({time: 'desc'});
        expect(getSort(['foo'], timePattern)).to.eql({time: 'desc'});
        expect(getSort({foo: 'bar'}, timePattern)).to.eql({time: 'desc'});
      });

      it('should sort by score on non-time patterns', function () {
        expect(getSort([], noTimePattern)).to.eql({_score: 'desc'});
        expect(getSort(['foo'], noTimePattern)).to.eql({_score: 'desc'});
        expect(getSort({foo: 'bar'}, noTimePattern)).to.eql({_score: 'desc'});
      });

    });
  });
});

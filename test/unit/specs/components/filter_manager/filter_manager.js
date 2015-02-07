define(function (require) {
  var filterManager = require('components/filter_manager/filter_manager');
  var $state;
  describe('Filter Manager', function () {
    beforeEach(function () {
      $state = {
        filters: []
      };
      filterManager.init($state);
    });

    it('should have an init function that sets the state to be used', function () {
      expect(filterManager.init).to.be.a(Function);
      filterManager.init($state);
      expect(filterManager.$state).to.be($state);
    });

    it('should have an `add` function', function () {
      expect(filterManager.add).to.be.a(Function);
    });

    it('should add a filter', function () {
      expect($state.filters.length).to.be(0);
      filterManager.add('myField', 1, '+', 'myIndex');
      expect($state.filters.length).to.be(1);
    });

    it('should add multiple filters if passed an array of values', function () {
      filterManager.add('myField', [1, 2, 3], '+', 'myIndex');
      expect($state.filters.length).to.be(3);
    });

    it('should add an exists filter if _exists_ is used as the field', function () {
      filterManager.add('_exists_', 'myField', '+', 'myIndex');
      expect($state.filters[0].exists).to.eql({field: 'myField'});
    });

    it('Should negate existing filter instead of added a conflicting filter', function () {
      filterManager.add('myField', 1, '+', 'myIndex');
      expect($state.filters.length).to.be(1);
      filterManager.add('myField', 1, '-', 'myIndex');
      expect($state.filters.length).to.be(1);
      expect($state.filters[0].meta.negate).to.be(true);

      filterManager.add('_exists_', 'myField', '+', 'myIndex');
      expect($state.filters.length).to.be(2);
      filterManager.add('_exists_', 'myField', '-', 'myIndex');
      expect($state.filters.length).to.be(2);
      expect($state.filters[1].meta.negate).to.be(true);
    });

  });
});


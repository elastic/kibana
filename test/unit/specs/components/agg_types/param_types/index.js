define(function (require) {
  describe('ParamTypes', function () {
    var childSuites = [
      require('specs/components/agg_types/param_types/_field'),
      require('specs/components/agg_types/param_types/_optioned'),
      require('specs/components/agg_types/param_types/_regex')
    ].forEach(function (s) {
      describe(s[0], s[1]);
    });
  });
});
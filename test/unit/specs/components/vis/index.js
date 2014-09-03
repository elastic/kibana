define(function (require) {
  describe('Vis Component', function () {
    var childSuites = [
      require('specs/components/vis/_agg_config'),
      require('specs/components/vis/_agg_configs')
    ].forEach(function (s) {
      describe(s[0], s[1]);
    });
  });
});
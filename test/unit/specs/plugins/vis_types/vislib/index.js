define(function (require) {
  describe('Vis Type, Vislib', function () {
    var childSuites = [
      require('specs/plugins/vis_types/vislib/_renderbot')
    ].forEach(function (s) {
      describe(s[0], s[1]);
    });
  });
});
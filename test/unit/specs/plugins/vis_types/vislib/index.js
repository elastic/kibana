define(function (require) {
  return ['Vislib', exportWrapper];

  function exportWrapper() {
    [
      require('specs/plugins/vis_types/vislib/_renderbot')
    ].forEach(function (s) {
      describe(s[0], s[1]);
    });
  }
});
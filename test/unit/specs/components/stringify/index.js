define(function (require) {
  describe('Stringify Component', function () {
    run(require('specs/components/stringify/_conformance'));
    run(require('specs/components/stringify/_ip'));
    run(require('specs/components/stringify/_source'));
    run(require('specs/components/stringify/_url'));

    function run(suite) {
      describe(suite[0], suite[1]);
    }
  });
});

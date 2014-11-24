define(function (require) {
  describe('Index Patterns', function () {
    run(require('specs/components/index_pattern/_cast_mapping_type'));
    run(require('specs/components/index_pattern/_map_field'));
    run(require('specs/components/index_pattern/_pattern_to_wildcard'));
    function run(mod) { describe(mod[0], mod[1]); }
  });
});
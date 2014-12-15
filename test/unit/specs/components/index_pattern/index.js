define(function (require) {
  describe('Index Patterns', function () {
    run(require('specs/components/index_pattern/_index_pattern'));
    run(require('specs/components/index_pattern/_cast_mapping_type'));
    run(require('specs/components/index_pattern/_map_field'));
    run(require('specs/components/index_pattern/_pattern_to_wildcard'));
    run(require('specs/components/index_pattern/_field_formats'));
    run(require('specs/components/index_pattern/_get_computed_fields'));

    function run(mod) { describe(mod[0], mod[1]); }
  });
});

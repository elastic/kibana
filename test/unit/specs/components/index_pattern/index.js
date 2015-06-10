define(function (require) {
  describe('Index Patterns', function () {
    describe(require('specs/components/index_pattern/_index_pattern'));
    describe(require('specs/components/index_pattern/_cast_mapping_type'));
    describe(require('specs/components/index_pattern/_map_field'));
    describe(require('specs/components/index_pattern/_pattern_to_wildcard'));
    describe(require('specs/components/index_pattern/_get_computed_fields'));
    describe(require('specs/components/index_pattern/_FieldFormat'));
  });
});

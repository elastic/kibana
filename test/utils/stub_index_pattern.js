define(function (require) {
  return function (Private) {
    var _ = require('lodash');
    var sinon = require('sinon/sinon');
    var IndexedArray = require('utils/indexed_array/index');
    var IndexPattern = require('components/index_patterns/_index_pattern');
    var flattenHit = require('components/index_patterns/_flatten_hit');
    var getComputedFields = require('components/index_patterns/_get_computed_fields');

    var fieldFormats = Private(require('registry/field_formats'));
    var Field = Private(require('components/index_patterns/_field'));

    function StubIndexPattern(pattern, timeField, fields) {
      this.id = pattern;
      this.popularizeField = sinon.spy();
      this.timeFieldName = timeField;
      this.getFields = sinon.spy();
      this.toIndexList = _.constant([pattern]);
      this.getComputedFields = getComputedFields;
      this.flattenHit = _.partial(flattenHit, this);
      this.metaFields = ['_id', '_type', '_source'];
      this.fieldFormatMap = {};
      this.routes = IndexPattern.prototype.routes;

      this.fields = new IndexedArray({
        index: ['name'],
        group: ['type'],
        initialSet: fields.map(function (field) {
          return new Field(this, field);
        }, this)
      });
    }

    return StubIndexPattern;
  };
});

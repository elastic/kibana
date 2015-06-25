define(function (require) {
  return function (Private) {
    var _ = require('lodash');
    var sinon = require('sinon/sinon');
    var IndexedArray = require('components/indexed_array/index');
    var IndexPattern = require('components/index_patterns/_index_pattern');
    var fieldFormats = Private(require('registry/field_formats'));
    var flattenHit = Private(require('components/index_patterns/_flatten_hit'));
    var formatHit = require('components/index_patterns/_format_hit');
    var getComputedFields = require('components/index_patterns/_get_computed_fields');

    var Field = Private(require('components/index_patterns/_field'));

    function StubIndexPattern(pattern, timeField, fields) {
      this.id = pattern;
      this.popularizeField = sinon.spy();
      this.timeFieldName = timeField;
      this.getNonScriptedFields = sinon.spy();
      this.getScriptedFields = sinon.spy();
      this.metaFields = ['_id', '_type', '_source'];
      this.fieldFormatMap = {};
      this.routes = IndexPattern.prototype.routes;

      this.toIndexList = _.constant([pattern]);
      this.getComputedFields = _.bind(getComputedFields, this);
      this.flattenHit = flattenHit(this);
      this.formatHit = formatHit(this, fieldFormats.getDefaultInstance('string'));
      this.formatField = this.formatHit.formatField;

      this._indexFields = function () {
        this.fields = new IndexedArray({
          index: ['name'],
          group: ['type'],
          initialSet: fields.map(function (field) {
            return new Field(this, field);
          }, this)
        });
      };

      this._indexFields();
    }

    return StubIndexPattern;
  };
});

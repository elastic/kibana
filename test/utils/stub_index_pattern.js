define(function (require) {
  return function (Private) {
    var sinon = require('sinon/sinon');
    var Registry = require('utils/registry/registry');
    var fieldFormats = Private(require('components/index_patterns/_field_formats'));

    function StubIndexPattern(pattern, timeField, fields) {
      this.popularizeField = sinon.spy();
      this.fields = new Registry({
        index: ['name'],
        group: ['type'],
        initialSet: fields.map(function (field) {
          field.count = field.count || 0;

          // non-enumerable type so that it does not get included in the JSON
          Object.defineProperty(field, 'format', {
            enumerable: false,
            get: function () {
              fieldFormats.defaultByType[field.type];
            }
          });

          return field;
        })
      });
    }
    return StubIndexPattern;
  };
});
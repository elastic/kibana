define(function (require) {
  let fieldFormats = require('ui/registry/field_formats');
  fieldFormats.register(require('ui/stringify/types/Url'));
  fieldFormats.register(require('ui/stringify/types/Bytes'));
  fieldFormats.register(require('ui/stringify/types/Date'));
  fieldFormats.register(require('ui/stringify/types/Ip'));
  fieldFormats.register(require('ui/stringify/types/Number'));
  fieldFormats.register(require('ui/stringify/types/Percent'));
  fieldFormats.register(require('ui/stringify/types/String'));
  fieldFormats.register(require('ui/stringify/types/Source'));
  fieldFormats.register(require('ui/stringify/types/Color'));
  fieldFormats.register(require('ui/stringify/types/truncate'));
});

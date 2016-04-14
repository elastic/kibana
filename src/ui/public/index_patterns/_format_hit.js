// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a formated version
define(function (require) {
  let _ = require('lodash');

  return function (indexPattern, defaultFormat) {

    function convert(hit, val, fieldName) {
      let field = indexPattern.fields.byName[fieldName];
      if (!field) return defaultFormat.convert(val, 'html');
      return field.format.getConverterFor('html')(val, field, hit);
    }

    function formatHit(hit) {
      if (hit.$$_formatted) return hit.$$_formatted;

      // use and update the partial cache, but don't rewrite it. _source is stored in partials
      // but not $$_formatted
      let partials = hit.$$_partialFormatted || (hit.$$_partialFormatted = {});
      let cache = hit.$$_formatted = {};

      _.forOwn(indexPattern.flattenHit(hit), function (val, fieldName) {
        // sync the formatted and partial cache
        let formatted = partials[fieldName] == null ? convert(hit, val, fieldName) : partials[fieldName];
        cache[fieldName] = partials[fieldName] = formatted;
      });

      return cache;
    }

    formatHit.formatField = function (hit, fieldName) {
      let partials = hit.$$_partialFormatted;
      if (partials && partials[fieldName] != null) {
        return partials[fieldName];
      }

      if (!partials) {
        partials = hit.$$_partialFormatted = {};
      }

      let val = fieldName === '_source' ? hit._source : indexPattern.flattenHit(hit)[fieldName];
      return partials[fieldName] = convert(hit, val, fieldName);
    };

    return formatHit;
  };

});

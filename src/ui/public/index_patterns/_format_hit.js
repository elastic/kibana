import _ from 'lodash';
// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a formated version

export default function (indexPattern, defaultFormat) {

  function convert(hit, val, fieldName, recurse) {
    const field = indexPattern.fields.byName[fieldName];
    if (!field) {
      if (val.constructor === Array && recurse) {
        const pArr = [];
        _.forEach(val, function (item) {
          const pStore = {};
          _.forEach(item, function (val, fieldName) {
            pStore[fieldName] = convert(hit, val, fieldName, true);
          });
          pArr.push(pStore);
        });
        return pArr;
      } else {
        return defaultFormat.convert(val, 'html');
      }
    }
    return field.format.getConverterFor('html')(val, field, hit);
  }

  function formatHit(hit) {
    if (hit.$$_formatted) return hit.$$_formatted;

    // use and update the partial cache, but don't rewrite it. _source is stored in partials
    // but not $$_formatted
    const partials = hit.$$_partialFormatted || (hit.$$_partialFormatted = {});
    const cache = hit.$$_formatted = {};
    const tableFormatted = {};

    _.forOwn(indexPattern.flattenHit(hit), function (val, fieldName) {
      // sync the formatted and partial cache
      const formatted = partials[fieldName] == null ? convert(hit, val, fieldName, true) : partials[fieldName];
      cache[fieldName] = partials[fieldName] = formatted;
      tableFormatted[fieldName] = convert(hit, val, fieldName, false);
    });

    return tableFormatted;
  }

  formatHit.formatField = function (hit, fieldName) {
    let partials = hit.$$_partialFormatted;
    if (partials && partials[fieldName] != null) {
      return partials[fieldName];
    }

    if (!partials) {
      partials = hit.$$_partialFormatted = {};
    }

    const val = fieldName === '_source' ? hit._source : indexPattern.flattenHit(hit)[fieldName];
    return partials[fieldName] = convert(hit, val, fieldName, false);
  };

  return formatHit;
}


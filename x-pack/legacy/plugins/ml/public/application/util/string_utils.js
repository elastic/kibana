/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Contains utility functions for performing operations on Strings.
 */
import _ from 'lodash';
import d3 from 'd3';

// Replaces all instances of dollar delimited tokens in the specified String
// with corresponding values from the supplied object, optionally
// encoding the replacement for a URI component.
// For example if passed a String 'http://www.google.co.uk/#q=airline+code+$airline$'
// and valuesByTokenName of {"airline":"AAL"}, will return
// 'http://www.google.co.uk/#q=airline+code+AAL'.
// If a corresponding key is not found in valuesByTokenName, then the String is not replaced.
export function replaceStringTokens(str, valuesByTokenName, encodeForURI) {
  return String(str).replace(/\$([^?&$\'"]+)\$/g, (match, name) => {
    // Use lodash get to allow nested JSON fields to be retrieved.
    let tokenValue = _.get(valuesByTokenName, name, null);
    if (encodeForURI === true && tokenValue !== null) {
      tokenValue = encodeURIComponent(tokenValue);
    }

    // If property not found string is not replaced.
    return tokenValue !== null ? tokenValue : match;
  });
}

// creates the default description for a given detector
export function detectorToString(dtr) {
  const BY_TOKEN = ' by ';
  const OVER_TOKEN = ' over ';
  const USE_NULL_OPTION = ' use_null=';
  const PARTITION_FIELD_OPTION = ' partition_field_name=';
  const EXCLUDE_FREQUENT_OPTION = ' exclude_frequent=';

  let txt = '';

  if (dtr.function !== undefined && dtr.function !== '') {
    txt += dtr.function;
    if (dtr.field_name !== undefined && dtr.field_name !== '') {
      txt += '(' + quoteField(dtr.field_name) + ')';
    }
  } else if (dtr.field_name !== undefined && dtr.field_name !== '') {
    txt += quoteField(dtr.field_name);
  }

  if (dtr.by_field_name !== undefined && dtr.by_field_name !== '') {
    txt += BY_TOKEN + quoteField(dtr.by_field_name);
  }

  if (dtr.over_field_name !== undefined && dtr.over_field_name !== '') {
    txt += OVER_TOKEN + quoteField(dtr.over_field_name);
  }

  if (dtr.use_null !== undefined) {
    txt += USE_NULL_OPTION + dtr.use_null;
  }

  if (dtr.partition_field_name !== undefined && dtr.partition_field_name !== '') {
    txt += PARTITION_FIELD_OPTION + quoteField(dtr.partition_field_name);
  }

  if (dtr.exclude_frequent !== undefined && dtr.exclude_frequent !== '') {
    txt += EXCLUDE_FREQUENT_OPTION + dtr.exclude_frequent;
  }

  return txt;
}

// wrap a the inputed string in quotes if it contains non-word characters
function quoteField(field) {
  if (field.match(/\W/g)) {
    return '"' + field + '"';
  } else {
    return field;
  }
}

// re-order an object based on the value of the keys
export function sortByKey(list, reverse, comparator) {
  let keys = _.sortBy(_.keys(list), key => {
    return comparator ? comparator(list[key], key) : key;
  });

  if (reverse) {
    keys = keys.reverse();
  }

  return _.object(
    keys,
    _.map(keys, key => {
      return list[key];
    })
  );
}

// guess the time format for a given time string
export function guessTimeFormat(time) {
  let format = '';
  let matched = false;
  if (isNaN(time)) {
    let match;

    // match date format
    if (!matched) {
      let reg = '';

      reg += '('; // 1   ( date

      reg += '('; // 2   ( yyyy-MM-dd
      reg += '(\\d{4})'; // 3   yyyy
      reg += '([-/.\\s])'; // 4   - or . or \s
      reg += '('; // 5   ( month
      reg += '([01]\\d)'; // 6   MM
      reg += '|'; //     or
      reg += '(\\w{3})'; // 7   MMM
      reg += ')'; //     ) end month
      reg += '([-/.\\s])'; // 8   - or . or \s
      reg += '([0-3]\\d)'; // 9   dd  0-3 and 0-9
      reg += ')'; //     ) end yyyy-MM-dd

      reg += '|'; //     or

      reg += '('; // 10  ( d[d]-MM[M]-yyyy or MM[M]-d[d]-yyyy

      reg += '('; // 11  ( day or month
      reg += '(\\d{1,2})'; // 12  d or M or dd or MM
      reg += '|'; //     or
      reg += '(\\w{3})'; // 13  MMM
      reg += ')'; //     ) end day or month

      reg += '([-/.\\s])'; // 14  - or . or \s

      reg += '('; // 15  ( day or month
      reg += '(\\d{1,2})'; // 12  d or M or dd or MM
      reg += '|'; //     or
      reg += '(\\w{3})'; // 17  MMM
      reg += ')'; //     ) end day or month

      reg += '([-/.\\s])'; // 18  - or . or \s
      reg += '(\\d{4})'; // 19   yyyy
      reg += ')'; //     ) end d[d]-MM[M]-yyyy or MM[M]-d[d]-yyyy

      reg += ')'; //     ) end date

      reg += '([T\\s])?'; // 20  T or space

      reg += '([0-2]\\d)'; // 21  HH 0-2 and 0-9
      reg += '([:.])'; // 22  :.
      reg += '([0-5]\\d)'; // 23  mm  0-5 and 0-9
      reg += '('; // 24  ( optional secs
      reg += '([:.])'; // 25  :.
      reg += '([0-5]\\d)'; // 26  ss  0-5 and 0-9
      reg += ')?'; //     ) end optional secs
      reg += '('; // 27  ( optional millisecs
      reg += '([:.])'; // 28  :.
      reg += '(\\d{3})'; // 29  3 * 0-9
      reg += ')?'; //     ) end optional millisecs
      reg += '('; // 30  ( optional timezone matches
      reg += '([+-]\\d{2}[:.]\\d{2}[:.]\\d{2})'; // 31  +- 0-9 0-9 :. 0-9 0-9 :. 0-9 0-9 e.g. +00:00:00
      reg += '|'; //     or
      reg += '([+-]\\d{2}[:.]\\d{2})'; // 32  +- 0-9 0-9 :. 0-9 0-9 e.g. +00:00
      reg += '|'; //     or
      reg += '([+-]\\d{6})'; // 33  +- 6 * 0-9 e.g. +000000
      reg += '|'; //     or
      reg += '([+-]\\d{4})'; // 34  +- 4 * 0-9 e.g. +0000
      reg += '|'; //     or
      reg += '(Z)'; // 35  Z
      reg += '|'; //     or
      reg += '([+-]\\d{2})'; // 36  +- 0-9 0-9 e.g. +00
      reg += '|'; //     or
      reg += '('; // 37  ( string timezone
      reg += '(\\s)'; // 38  optional space
      reg += '(\\w{1,4})'; // 39  1-4 letters e.g UTC
      reg += ')'; //     ) end string timezone
      reg += ')?'; //     ) end optional timezone

      console.log('guessTimeFormat: time format regex: ' + reg);

      match = time.match(new RegExp(reg));
      // console.log(match);
      if (match) {
        // add the standard data and time
        if (match[2] !== undefined) {
          // match yyyy-[MM MMM]-dd
          format += 'yyyy';
          format += match[4];
          if (match[6] !== undefined) {
            format += 'MM';
          } else if (match[7] !== undefined) {
            format += 'MMM';
          }
          format += match[8];
          format += 'dd';
        } else if (match[10] !== undefined) {
          // match dd-MM[M]-yyyy or MM[M]-dd-yyyy

          if (match[13] !== undefined) {
            // found a word as the first part
            // e.g., Jan 01 2000
            format += 'MMM';
            format += match[14];
            format += 'dd';
          } else if (match[17] !== undefined) {
            // found a word as the second part
            // e.g., 01 Jan 2000
            format += 'dd';
            format += match[14];
            format += 'MMM';
          } else {
            // check to see if the first number is greater than 12
            // e.g., 24/03/1981
            // this is a guess, but is only thing we can do
            // with one line from the data set
            if (match[12] !== undefined && +match[12] > 12) {
              format += 'dd';
              format += match[14];
              format += 'MM';
            } else {
              // default to US format.
              format += 'MM';
              format += match[14];
              format += 'dd';
            }
          }

          format += match[18];
          format += 'yyyy';
        }

        // optional T or space splitter
        // wrap T in single quotes
        format += match[20] === 'T' ? "'" + match[20] + "'" : match[20];
        format += 'HH';
        format += match[22];
        format += 'mm';

        // add optional secs
        if (match[24] !== undefined) {
          format += match[25];
          format += 'ss';
        }

        // add optional millisecs
        if (match[27] !== undefined) {
          // .000
          format += match[28];
          format += 'SSS';
        }

        // add optional time zone
        if (match[31] !== undefined) {
          // +00:00:00
          format += 'XXXXX';
        } else if (match[32] !== undefined) {
          // +00:00
          format += 'XXX';
        } else if (match[33] !== undefined) {
          // +000000
          format += 'XXXX';
        } else if (match[34] !== undefined) {
          // +0000
          format += 'Z';
        } else if (match[35] !== undefined || match[36] !== undefined) {
          // Z or +00
          format += 'X';
        } else if (match[37] !== undefined) {
          // UTC
          if (match[38] !== undefined) {
            // add optional space char
            format += match[38];
          }
          // add time zone name, up to 4 chars
          for (let i = 0; i < match[39].length; i++) {
            format += 'z';
          }
        }
        matched = true;
      }
    }
  } else {
    // time field is a number, so probably epoch or epoch_ms
    if (time > 10000000000) {
      // probably milliseconds
      format = 'epoch_ms';
    } else {
      // probably seconds
      format = 'epoch';
    }
    matched = true;
  }

  if (matched) {
    console.log('guessTimeFormat: guessed time format: ', format);
  } else {
    console.log('guessTimeFormat: time format could not be guessed from: ' + time);
  }

  return format;
}

// add commas to large numbers
// Number.toLocaleString is not supported on safari
export function toLocaleString(x) {
  let result = x;
  if (x && typeof x === 'number') {
    const parts = x.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    result = parts.join('.');
  }
  return result;
}

// escape html characters
export function mlEscape(str) {
  const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };
  return String(str).replace(/[&<>"'\/]/g, s => entityMap[s]);
}

// Escapes reserved characters for use in Elasticsearch query terms.
export function escapeForElasticsearchQuery(str) {
  // Escape with a leading backslash any of the characters that
  // Elastic document may cause a syntax error when used in queries:
  // + - = && || > < ! ( ) { } [ ] ^ " ~ * ? : \ /
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters
  return String(str).replace(/[-[\]{}()+!<>=?:\/\\^"~*&|\s]/g, '\\$&');
}

export function calculateTextWidth(txt, isNumber, elementSelection) {
  txt = isNumber ? d3.format(',')(txt) : txt;
  let svg = elementSelection;
  let $el;
  if (elementSelection === undefined) {
    // Create a temporary selection to append the label to.
    // Note styling of font will be inherited from CSS of page.
    const $body = d3.select('body');
    $el = $body.append('div');
    svg = $el.append('svg');
  }

  const tempLabelText = svg
    .append('g')
    .attr('class', 'temp-axis-label tick')
    .selectAll('text.temp.axis')
    .data('a')
    .enter()
    .append('text')
    .text(txt);
  const width = tempLabelText[0][0].getBBox().width;

  d3.select('.temp-axis-label').remove();
  if ($el !== undefined) {
    $el.remove();
  }
  return Math.ceil(width);
}

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import chrome from '../chrome';

// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a formatted version

export function formatHit(indexPattern, defaultFormat) {

  function convert(hit, val, fieldName) {
    const field = indexPattern.fields.byName[fieldName];
    if (!field) return defaultFormat.convert(val, 'html');
    const parsedUrl = {
      origin: window.location.origin,
      pathname: window.location.pathname,
      basePath: chrome.getBasePath(),
    };
    return field.format.getConverterFor('html')(val, field, hit, parsedUrl);
  }

  function formatHit(hit) {
    if (hit.$$_formatted) return hit.$$_formatted;

    // use and update the partial cache, but don't rewrite it. _source is stored in partials
    // but not $$_formatted
    const partials = hit.$$_partialFormatted || (hit.$$_partialFormatted = {});
    const cache = hit.$$_formatted = {};

    _.forOwn(indexPattern.flattenHit(hit), function (val, fieldName) {
      // sync the formatted and partial cache
      const formatted = partials[fieldName] == null ? convert(hit, val, fieldName) : partials[fieldName];
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

    const val = fieldName === '_source' ? hit._source : indexPattern.flattenHit(hit)[fieldName];
    return partials[fieldName] = convert(hit, val, fieldName);
  };

  return formatHit;
}


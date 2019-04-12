/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


const venn = require('venn.js');
module.exports = (function () {

  // Unwrap elasticsearch field names from mappings
  // into a flattened list of field names
  function unwrapFieldNames(obj, path, fields) {
    if (!obj.properties) {
      return;
    }
    for (const p in obj.properties) {
      const child = obj.properties[p];
      if (child.properties) {
        path.push(p);
        unwrapFieldNames(child, path, fields);
        path.pop();
      } else {
        let parentName = '';
        for (const i in path) {
          parentName += path[i];
          parentName += '.';
        }
        // Need to clone the path array here:
        fields.push({
          'name': parentName + p,
          'path': path.slice(0),
          'leafName': p
        });
        if (child.fields) {
          for (const mfield in child.fields) {
            fields.push({
              'name': parentName + p + '.' + mfield,
              'path': path.slice(0),
              'leafName': p
            });

          }
        }
      }
    }
  }

  function getMergeSuggestionObjects(termIntersects) {
    const mergeCandidates = [];
    for (const i in termIntersects) {
      const ti = termIntersects[i];
      mergeCandidates.push({
        'id1': ti.id1,
        'id2': ti.id2,
        'term1': ti.term1,
        'term2': ti.term2,
        'v1': ti.v1,
        'v2': ti.v2,
        'overlap': ti.overlap,
        width: 100,
        height: 60 });

    }
    return mergeCandidates;
  }


  return {
    'unwrapFieldNames': unwrapFieldNames,
    'getMergeSuggestionObjects': getMergeSuggestionObjects
  };

}());

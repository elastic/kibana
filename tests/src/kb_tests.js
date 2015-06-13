/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */



define([
  'kb',
  'mappings',
  'kb/api',
  'autocomplete/engine'
], function (kb, mappings, api, autocomplete_engine) {
  'use strict';

  module("Knowledge base", {
    setup: function () {
      mappings.clear();
      kb.setActiveApi(new api.Api());
    },
    teardown: function () {
      mappings.clear();
      kb.setActiveApi(new api.Api());
    }
  });

  var MAPPING = {
    "index1": {
      "type1.1": {
        "properties": {
          "field1.1.1": { "type": "string" },
          "field1.1.2": { "type": "long" }
        }
      },
      "type1.2": {
        "properties": {
        }
      }
    },
    "index2": {
      "type2.1": {
        "properties": {
          "field2.1.1": { "type": "string" },
          "field2.1.2": { "type": "string" }
        }
      }
    }
  };

  function testUrlContext(tokenPath, otherTokenValues, expectedContext) {

    if (expectedContext.autoCompleteSet) {
      expectedContext.autoCompleteSet = _.map(expectedContext.autoCompleteSet, function (t) {
        if (_.isString(t)) {
          t = { name: t}
        }
        return t;
      })
    }

    var context = { otherTokenValues: otherTokenValues};
    autocomplete_engine.populateContext(tokenPath, context, null,
      expectedContext.autoCompleteSet, kb.getTopLevelUrlCompleteComponents()
    );

    // override context to just check on id
    if (context.endpoint) {
      context.endpoint = context.endpoint.id;
    }

    delete context.otherTokenValues;

    function norm(t) {
      if (_.isString(t)) {
        return { name: t };
      }
      return t;
    }

    if (context.autoCompleteSet) {
      context.autoCompleteSet = _.sortBy(_.map(context.autoCompleteSet, norm), 'name');
    }
    if (expectedContext.autoCompleteSet) {
      expectedContext.autoCompleteSet = _.sortBy(_.map(expectedContext.autoCompleteSet, norm), 'name');
    }

    deepEqual(context, expectedContext);
  }

  function t(term) {
    return { name: term, meta: "type"};
  }

  function i(term) {
    return { name: term, meta: "index"};
  }

  function index_test(name, tokenPath, otherTokenValues, expectedContext) {
    test(name, function () {
      var test_api = new api.Api("text", kb._test.globalUrlComponentFactories);
      test_api.addEndpointDescription("_multi_indices", {
        patterns: ["{indices}/_multi_indices"]
      });
      test_api.addEndpointDescription("_single_index", {
        patterns: ["{index}/_single_index"]
      });
      test_api.addEndpointDescription("_no_index", {
        // testing default patterns
        //  patterns: ["_no_index"]
      });
      kb.setActiveApi(test_api);

      mappings.loadMappings(MAPPING);
      testUrlContext(tokenPath, otherTokenValues, expectedContext);
    });
  }

  index_test("Index integration 1", [], [],
    { autoCompleteSet: ["_no_index", i("index1"), i("index2")]}
  );

  index_test("Index integration 2", [], ["index1"],
    // still return _no_index as index1 is not committed to yet.
    { autoCompleteSet: ["_no_index", i("index2")]}
  );

  index_test("Index integration 2", ["index1"], [],
    { indices: ["index1"], autoCompleteSet: ["_multi_indices", "_single_index"]}
  );

  index_test("Index integration 2", [
    ["index1", "index2"]
  ], [],
    { indices: ["index1", "index2"], autoCompleteSet: ["_multi_indices"]}
  );

  function type_test(name, tokenPath, otherTokenValues, expectedContext) {
    test(name, function () {
      var test_api = new api.Api("type_test", kb._test.globalUrlComponentFactories);

      test_api.addEndpointDescription("_multi_types", {
        patterns: ["{indices}/{types}/_multi_types"]
      });
      test_api.addEndpointDescription("_single_type", {
        patterns: ["{indices}/{type}/_single_type"]
      });
      test_api.addEndpointDescription("_no_types", {
        patterns: ["{indices}/_no_types"]
      });
      kb.setActiveApi(test_api);

      mappings.loadMappings(MAPPING);

      testUrlContext(tokenPath, otherTokenValues, expectedContext);

    });
  }

  type_test("Type integration 1", ["index1"], [],
    { indices: ["index1"], autoCompleteSet: ["_no_types", t("type1.1"), t("type1.2")]}
  );
  type_test("Type integration 2", ["index1"], ["type1.2"],
    // we are not yet comitted to type1.2, so _no_types is returned
    { indices: ["index1"], autoCompleteSet: ["_no_types", t("type1.1")]}
  );

  type_test("Type integration 3", ["index2"], [],
    { indices: ["index2"], autoCompleteSet: ["_no_types", t("type2.1")]}
  );

  type_test("Type integration 4", ["index1", "type1.2"], [],
    { indices: ["index1"], types: ["type1.2"], autoCompleteSet: ["_multi_types", "_single_type"]}
  );

  type_test("Type integration 5", [
    ["index1", "index2"],
    ["type1.2", "type1.1"]
  ], [],
    { indices: ["index1", "index2"], types: ["type1.2", "type1.1"], autoCompleteSet: ["_multi_types"]}
  );


});
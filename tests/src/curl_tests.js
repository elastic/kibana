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
  'vendor/_',
  'curl',
  'text!test_src/curl_tests.txt'
], function (_, curl, curlTests) {
  'use strict';

  module("CURL");

  var notCURLS = [
    'sldhfsljfhs',
    's;kdjfsldkfj curl -XDELETE ""',
    '{ "hello": 1 }'
  ];

  function compareCURL(result, expected) {
    deepEqual(result.server, expected.server);
    deepEqual(result.method, expected.method);
    deepEqual(result.url, expected.url);
    deepEqual(result.data, expected.data);
  }


  _.each(notCURLS, function (notCURL, i) {
    test("cURL Detection - broken strings " + i, function () {
      ok(!curl.detectCURL(notCURL), "marked as curl while it wasn't:" + notCURL);
    });
  });

  _.each(curlTests.split(/^=+$/m), function (fixture) {
    if (fixture.trim() == "") {
      return;
    }
    fixture = fixture.split(/^-+$/m);
    var name = fixture[0].trim(),
      curlText = fixture[1].trim(),
      response = fixture[2].trim(),
      data = (fixture[3] || "").trim();

    try {
      response = JSON.parse(response);
    } catch (e) {
      throw "error parsing [" + name + ": " + response + "\n" + e;
    }
    response.data = data;

    test("cURL Detection - " + name, function () {
      ok(curl.detectCURL(curlText), "marked as not curl while it was:" + curlText);
      var r = curl.parseCURL(curlText);
      compareCURL(r, response);
    });
  })
    
});
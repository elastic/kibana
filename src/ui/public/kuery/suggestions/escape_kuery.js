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

export function escapeQuotes(string) {
  return string.replace(/"/g, '\\"');
}

export const escapeKuery = (string) => escapeNot(escapeAndOr(escapeSpecialCharacters(string)));

// See the SpecialCharacter rule in kuery.peg
function escapeSpecialCharacters(string) {
  return string.replace(/[\\():<>"*]/g, '\\$&'); // $& means the whole matched string
}

// See the Keyword rule in kuery.peg
function escapeAndOr(string) {
  return string.replace(/(\s+)(and|or)(\s+)/ig, '$1\\$2$3');
}

function escapeNot(string) {
  return string.replace(/not(\s+)/ig, '\\$&');
}

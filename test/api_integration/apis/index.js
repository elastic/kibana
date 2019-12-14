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

export default function({ loadTestFile }) {
  describe('apis', () => {
    loadTestFile(require.resolve('./core'));
    loadTestFile(require.resolve('./elasticsearch'));
    loadTestFile(require.resolve('./general'));
    loadTestFile(require.resolve('./home'));
    loadTestFile(require.resolve('./index_patterns'));
    loadTestFile(require.resolve('./kql_telemetry'));
    loadTestFile(require.resolve('./management'));
    loadTestFile(require.resolve('./saved_objects'));
    loadTestFile(require.resolve('./scripts'));
    loadTestFile(require.resolve('./search'));
    loadTestFile(require.resolve('./shorten'));
    loadTestFile(require.resolve('./suggestions'));
    loadTestFile(require.resolve('./status'));
    loadTestFile(require.resolve('./stats'));
    loadTestFile(require.resolve('./ui_metric'));
    loadTestFile(require.resolve('./core'));
  });
}

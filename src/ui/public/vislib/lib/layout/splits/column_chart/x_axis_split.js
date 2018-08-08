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

import d3 from 'd3';


export function VislibLibLayoutSplitsColumnChartXAxisSplitProvider() {
  /*
   * Adds div DOM elements to the `.x-axis-div-wrapper` element based on the data layout.
   * For example, if the data has rows, it returns the same number of
   * `.x-axis-div` elements as row objects.
   */

  return function (selection) {
    selection.each(function () {
      const div = d3.select(this);
      let columns;
      div.selectAll('.x-axis-div')
        .append('div')
        .data(function (d) {
          columns = d.columns ? d.columns.length : 1;
          return d.columns ? d.columns : [d];
        })
        .enter()
        .append('div')
        .attr('class', (d, i) => {
          let divClass = '';
          if (i === 0) {
            divClass += ' chart-first';
          }
          if (i === columns - 1) {
            divClass += ' chart-last';
          }
          return 'x-axis-div axis-div' + divClass;
        });
    });
  };
}

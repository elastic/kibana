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

import expect from 'expect.js';
import { buildPipelineVisFunction } from '../build_pipeline';

describe('visualize loader pipeline helpers: build pipeline', () => {
  describe('buildPipelineVisFunction', () => {
    it('handles vega function', () => {
      const type = 'vega';
      const visState = {
        params: {
          spec: 'this is a test'
        }
      };
      const actual = buildPipelineVisFunction[type](visState);
      expect(actual).to.be(`vega spec='this is a test' `);
    });

    it('handles input_control_vis function', () => {
      const type = 'input_control_vis';
      const visState = {
        params: {
          some: 'nested',
          data: {
            here: true
          }
        }
      };
      const actual = buildPipelineVisFunction[type](visState);
      expect(actual).to.be(`input_control_vis visConfig='{"some":"nested","data":{"here":true}}' `);
    });

    it('handles metrics function', () => {
      const type = 'metrics';
      const visState = {
        params: {
          foo: 'bar',
        }
      };
      const actual = buildPipelineVisFunction[type](visState);
      expect(actual).to.be(`tsvb params='{"foo":"bar"}' `);
    });

    it('handles timelion function', () => {
      const type = 'timelion';
      const visState = {
        params: {
          expression: 'foo',
          interval: 'bar',
        }
      };
      const actual = buildPipelineVisFunction[type](visState);
      expect(actual).to.be(`timelion_vis expression='foo' interval='bar' `);
    });

    it('handles markdown function', () => {
      const type = 'markdown';
      const visState = {
        params: {
          markdown: '## hello _markdown_',
          foo: 'bar',
        }
      };
      const actual = buildPipelineVisFunction[type](visState);
      expect(actual).to.be(`kibana_markdown expression='## hello _markdown_' visConfig='{"markdown":"## hello _markdown_","foo":"bar"}' `);
    });
  });
});

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

import { EditorConfigProviderRegistry } from './editor_config_providers';
import { EditorParamConfig, FixedParam, NumericIntervalParam } from './types';

describe('EditorConfigProvider', () => {
  let registry: EditorConfigProviderRegistry;

  beforeEach(() => {
    registry = new EditorConfigProviderRegistry();
  });

  it('should call registered providers with given parameters', () => {
    const provider = jest.fn(() => ({}));
    registry.register(provider);
    expect(provider).not.toHaveBeenCalled();
    const aggType = {};
    const indexPattern = {};
    const aggConfig = {};
    registry.getConfigForAgg(aggType, indexPattern, aggConfig);
    expect(provider).toHaveBeenCalledWith(aggType, indexPattern, aggConfig);
  });

  it('should call all registered providers with given parameters', () => {
    const provider = jest.fn(() => ({}));
    const provider2 = jest.fn(() => ({}));
    registry.register(provider);
    registry.register(provider2);
    expect(provider).not.toHaveBeenCalled();
    expect(provider2).not.toHaveBeenCalled();
    const aggType = {};
    const indexPattern = {};
    const aggConfig = {};
    registry.getConfigForAgg(aggType, indexPattern, aggConfig);
    expect(provider).toHaveBeenCalledWith(aggType, indexPattern, aggConfig);
    expect(provider2).toHaveBeenCalledWith(aggType, indexPattern, aggConfig);
  });

  describe('merging configs', () => {
    function singleConfig(paramConfig: EditorParamConfig) {
      return () => ({ singleParam: paramConfig });
    }

    function getOutputConfig(reg: EditorConfigProviderRegistry) {
      return reg.getConfigForAgg({}, {}, {}).singleParam;
    }

    it('should have hidden true if at least one config was hidden true', () => {
      registry.register(singleConfig({ hidden: false }));
      registry.register(singleConfig({ hidden: true }));
      registry.register(singleConfig({ hidden: false }));
      const config = getOutputConfig(registry);
      expect(config.hidden).toBe(true);
    });

    it('should merge the same fixed values', () => {
      registry.register(singleConfig({ fixedValue: 'foo' }));
      registry.register(singleConfig({ fixedValue: 'foo' }));
      const config = getOutputConfig(registry) as FixedParam;
      expect(config).toHaveProperty('fixedValue');
      expect(config.fixedValue).toBe('foo');
    });

    it('should throw having different fixed values', () => {
      registry.register(singleConfig({ fixedValue: 'foo' }));
      registry.register(singleConfig({ fixedValue: 'bar' }));
      expect(() => {
        getOutputConfig(registry);
      }).toThrowError();
    });

    it('should allow same base values', () => {
      registry.register(singleConfig({ base: 5 }));
      registry.register(singleConfig({ base: 5 }));
      const config = getOutputConfig(registry) as NumericIntervalParam;
      expect(config).toHaveProperty('base');
      expect(config.base).toBe(5);
    });

    it('should merge multiple base values, using least common multiple', () => {
      registry.register(singleConfig({ base: 2 }));
      registry.register(singleConfig({ base: 5 }));
      registry.register(singleConfig({ base: 8 }));
      const config = getOutputConfig(registry) as NumericIntervalParam;
      expect(config).toHaveProperty('base');
      expect(config.base).toBe(40);
    });

    it('should throw on combining fixedValue with base', () => {
      registry.register(singleConfig({ fixedValue: 'foo' }));
      registry.register(singleConfig({ base: 5 }));
      expect(() => {
        getOutputConfig(registry);
      }).toThrowError();
    });

    it('should merge hidden together with fixedValue', () => {
      registry.register(singleConfig({ fixedValue: 'foo', hidden: true }));
      registry.register(singleConfig({ fixedValue: 'foo', hidden: false }));
      const config = getOutputConfig(registry) as FixedParam;
      expect(config).toHaveProperty('fixedValue');
      expect(config).toHaveProperty('hidden');
      expect(config.fixedValue).toBe('foo');
      expect(config.hidden).toBe(true);
    });

    it('should merge hidden together with base', () => {
      registry.register(singleConfig({ base: 2, hidden: false }));
      registry.register(singleConfig({ base: 13, hidden: false }));
      const config = getOutputConfig(registry) as NumericIntervalParam;
      expect(config).toHaveProperty('base');
      expect(config).toHaveProperty('hidden');
      expect(config.base).toBe(26);
      expect(config.hidden).toBe(false);
    });

    it('should merge warnings together into one string', () => {
      registry.register(singleConfig({ warning: 'Warning' }));
      registry.register(singleConfig({ warning: 'Another warning' }));
      const config = getOutputConfig(registry);
      expect(config).toHaveProperty('warning');
      expect(config.warning).toBe('Warning\n\nAnother warning');
    });
  });
});

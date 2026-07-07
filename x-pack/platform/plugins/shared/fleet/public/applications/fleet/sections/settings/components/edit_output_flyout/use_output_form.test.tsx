/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  extractDefaultDynamicKafkaTopics,
  extractDefaultStaticKafkaTopic,
} from './use_output_form';

describe('use_output_form', () => {
  describe('extractDefaultDynamicKafkaTopics', () => {
    it('should return empty array if not topic are passed', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
      });

      expect(res).toEqual([]);
    });

    it('should return empty array if topic do not include %{[', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topic: 'something',
      });

      expect(res).toEqual([]);
    });

    it('should return options for combobox if topic include %{[', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topic: '%{[default.dataset]}',
      });

      expect(res).toEqual([
        {
          label: 'default.dataset',
          value: 'default.dataset',
        },
      ]);
    });

    it('should return options for combobox if topic include %{[ and some special characters', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topic: '%{[@timestamp]}',
      });

      expect(res).toEqual([
        {
          label: '@timestamp',
          value: '@timestamp',
        },
      ]);
    });

    it('should return options for combobox if topic include %{[ and a custom name', () => {
      const res = extractDefaultDynamicKafkaTopics({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topic: '%{[something]}',
      });

      expect(res).toEqual([
        {
          label: 'something',
          value: 'something',
        },
      ]);
    });
  });

  describe('extractDefaultStaticKafkaTopic', () => {
    it('should return empty array if not topic are passed', () => {
      const res = extractDefaultStaticKafkaTopic({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
      });

      expect(res).toEqual('');
    });

    it('should return empty string if topic include %{[', () => {
      const res = extractDefaultStaticKafkaTopic({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topic: '%{[something]}',
      });

      expect(res).toEqual('');
    });

    it('should return the topic if topic field is defined', () => {
      const res = extractDefaultStaticKafkaTopic({
        type: 'kafka',
        name: 'new',
        is_default: false,
        is_default_monitoring: false,
        topic: 'something',
      });

      expect(res).toEqual('something');
    });
  });
});

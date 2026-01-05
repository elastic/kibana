/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findRulesRequestQuerySchema } from './v1';

describe('findRulesRequestQuerySchema', () => {
  describe('sort_field', () => {
    test('should NOT throw an error, when sort field is not part of the field to exclude', () => {
      expect(() =>
        findRulesRequestQuerySchema.validate({
          sort_field: 'name.keyword',
        })
      ).not.toThrow();
    });

    test('should NOT throw an error, when sort field is not a descendant of the field to exclude', () => {
      expect(() =>
        findRulesRequestQuerySchema.validate({
          sort_field: 'new_field.monitoring.metrics.success',
        })
      ).not.toThrow();
    });

    test('should throw an error, when sort field is part of the field to exclude', () => {
      expect(() =>
        findRulesRequestQuerySchema.validate({
          sort_field: 'monitoring.execution.calculated_metrics.success_ratio',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Sort is not supported on this field monitoring.execution.calculated_metrics.success_ratio"`
      );
    });
  });

  describe('search_fields', () => {
    test('should NOT throw an error, when search field is not part of the field to exclude', () => {
      expect(() =>
        findRulesRequestQuerySchema.validate({
          search_fields: ['name', 'tags'],
        })
      ).not.toThrow();
    });

    test('should NOT throw an error, when search field is not a descendant of the field to exclude', () => {
      expect(() =>
        findRulesRequestQuerySchema.validate({
          search_fields: ['name', 'tags', 'new_field.monitoring.metrics.success'],
        })
      ).not.toThrow();
    });

    test('should throw an error, when search field is part of the field to exclude', () => {
      expect(() =>
        findRulesRequestQuerySchema.validate({
          search_fields: ['name', 'tags', 'monitoring.execution.calculated_metrics.success_ratio'],
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Search field monitoring.execution.calculated_metrics.success_ratio not supported"`
      );
    });
  });

  describe('filter', () => {
    test('should NOT throw an error, when filter does not contain any fields to exclude', () => {
      expect(() =>
        findRulesRequestQuerySchema.validate({
          filter: 'alert.attributes.name: "Rule I" and alert.attributes.tags: "fast"',
        })
      ).not.toThrow();
    });

    test('should NOT throw an error, when filter does not have any descendant of the field to exclude', () => {
      expect(() =>
        findRulesRequestQuerySchema.validate({
          filter:
            'alert.attributes.name: "Rule I" and alert.attributes.tags: "fast" and alert.attributes.new_field.monitoring.metrics.success > 50',
        })
      ).not.toThrow();
    });

    test('should NOT throw an error, when filter contains params with validate properties', () => {
      expect(() =>
        findRulesRequestQuerySchema.validate({
          filter:
            'alert.attributes.name: "Rule I" and alert.attributes.tags: "fast" and alert.attributes.params.risk_score > 50',
        })
      ).not.toThrow();
    });

    test('should throw an error, when filter contains the field to exclude', () => {
      expect(() =>
        findRulesRequestQuerySchema.validate({
          filter:
            'alert.attributes.name: "Rule I" and alert.attributes.tags: "fast" and alert.attributes.monitoring.execution.calculated_metrics.success_ratio > 50',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Filter is not supported on this field alert.attributes.monitoring.execution.calculated_metrics.success_ratio"`
      );
    });

    test('should throw an error, when a nested filter contains the field to exclude', () => {
      expect(() =>
        findRulesRequestQuerySchema.validate({
          filter:
            'alert.attributes.name: "Rule I" and alert.attributes.tags: "fast" and alert.attributes.actions:{ group: ".server-log" }',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Filter is not supported on this field alert.attributes.actions"`
      );
    });

    test('should throw an error, when filtering contains a property that is not valid', () => {
      expect(() =>
        findRulesRequestQuerySchema.validate({
          filter:
            'alert.attributes.name: "Rule I" and alert.attributes.tags: "fast" and alert.attributes.mapped_params.risk_score > 50',
        })
      ).toThrowErrorMatchingInlineSnapshot(
        `"Filter is not supported on this field alert.attributes.mapped_params.risk_score"`
      );
    });
  });
});

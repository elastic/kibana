/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { trace } from '@opentelemetry/api';
import {
  createTracer,
  createTracerFactory,
  getAgentBuilderTracer,
  AGENT_BUILDER_TRACER_NAME,
} from './create_tracer';

describe('create_tracer', () => {
  describe('createTracer', () => {
    it('creates a tracer with the default name', () => {
      const tracer = createTracer();

      expect(tracer).toBeDefined();
      // The tracer should be retrievable with the same name
      expect(tracer).toBe(trace.getTracer(AGENT_BUILDER_TRACER_NAME));
    });

    it('creates a tracer with a custom name', () => {
      const customName = 'agent_builder/tools';
      const tracer = createTracer({ name: customName });

      expect(tracer).toBeDefined();
      expect(tracer).toBe(trace.getTracer(customName));
    });

    it('creates a versioned tracer', () => {
      const version = '1.0.0';
      const tracer = createTracer({ version });

      expect(tracer).toBeDefined();
      expect(tracer).toBe(trace.getTracer(AGENT_BUILDER_TRACER_NAME, version));
    });

    it('creates a tracer with custom name and version', () => {
      const name = 'agent_builder/runner';
      const version = '2.0.0';
      const tracer = createTracer({ name, version });

      expect(tracer).toBeDefined();
      expect(tracer).toBe(trace.getTracer(name, version));
    });
  });

  describe('getAgentBuilderTracer', () => {
    it('returns the default agent_builder tracer', () => {
      const tracer = getAgentBuilderTracer();

      expect(tracer).toBeDefined();
      expect(tracer).toBe(trace.getTracer(AGENT_BUILDER_TRACER_NAME));
    });

    it('returns the same tracer instance on multiple calls', () => {
      const tracer1 = getAgentBuilderTracer();
      const tracer2 = getAgentBuilderTracer();

      expect(tracer1).toBe(tracer2);
    });
  });

  describe('createTracerFactory', () => {
    it('creates a factory that produces tracers with default options', () => {
      const factory = createTracerFactory();

      const tracer = factory();
      expect(tracer).toBeDefined();
      expect(tracer).toBe(trace.getTracer(AGENT_BUILDER_TRACER_NAME));
    });

    it('creates a factory that produces named tracers', () => {
      const factory = createTracerFactory();

      const toolsTracer = factory('agent_builder/tools');
      const runnerTracer = factory('agent_builder/runner');

      expect(toolsTracer).toBe(trace.getTracer('agent_builder/tools'));
      expect(runnerTracer).toBe(trace.getTracer('agent_builder/runner'));
      expect(toolsTracer).not.toBe(runnerTracer);
    });

    it('creates a factory with shared version', () => {
      const version = '1.0.0';
      const factory = createTracerFactory({ version });

      const tracer1 = factory('agent_builder/scope1');
      const tracer2 = factory('agent_builder/scope2');

      expect(tracer1).toBe(trace.getTracer('agent_builder/scope1', version));
      expect(tracer2).toBe(trace.getTracer('agent_builder/scope2', version));
    });

    it('falls back to default name when called without arguments', () => {
      const factory = createTracerFactory({ version: '1.0.0' });

      const tracer = factory();
      expect(tracer).toBe(trace.getTracer(AGENT_BUILDER_TRACER_NAME, '1.0.0'));
    });
  });

  describe('AGENT_BUILDER_TRACER_NAME', () => {
    it('has the expected value', () => {
      expect(AGENT_BUILDER_TRACER_NAME).toBe('agent_builder');
    });
  });
});

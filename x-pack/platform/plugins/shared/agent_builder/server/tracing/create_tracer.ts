/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Tracer, TracerOptions } from '@opentelemetry/api';
import { trace } from '@opentelemetry/api';

/** Default tracer name for agent_builder plugin */
export const AGENT_BUILDER_TRACER_NAME = 'agent_builder';

export interface CreateTracerOptions {
  /**
   * Name of the tracer. This appears in spans and helps identify the source.
   * Defaults to 'agent_builder'.
   */
  name?: string;
  /**
   * Version of the tracer/instrumentation. Typically the plugin version.
   */
  version?: string;
  /**
   * Additional OpenTelemetry tracer options.
   */
  tracerOptions?: TracerOptions;
}

/**
 * Creates a tracer for the agent_builder plugin.
 *
 * Tracers are used to create spans for distributed tracing. Each tracer
 * should have a unique name that identifies the instrumentation scope
 * (e.g., 'agent_builder', 'agent_builder/tools', 'agent_builder/runner').
 *
 * @example
 * ```ts
 * // Create default agent_builder tracer
 * const tracer = createTracer();
 *
 * // Create a tracer for a specific scope
 * const toolsTracer = createTracer({ name: 'agent_builder/tools' });
 *
 * // Create a versioned tracer
 * const versionedTracer = createTracer({
 *   name: 'agent_builder',
 *   version: '1.0.0'
 * });
 * ```
 */
export function createTracer(options: CreateTracerOptions = {}): Tracer {
  const { name = AGENT_BUILDER_TRACER_NAME, version, tracerOptions } = options;
  return trace.getTracer(name, version, tracerOptions);
}

/**
 * Returns the default tracer for the agent_builder plugin.
 *
 * This is a convenience function that returns a singleton-like tracer
 * with the default agent_builder name. Use this when you don't need
 * a specific tracer scope.
 *
 * @example
 * ```ts
 * import { getAgentBuilderTracer } from './tracing';
 *
 * const tracer = getAgentBuilderTracer();
 * tracer.startSpan('myOperation');
 * ```
 */
export function getAgentBuilderTracer(): Tracer {
  return createTracer();
}

/**
 * Creates a factory function for tracers with a shared configuration.
 *
 * Useful when you need to create multiple tracers with the same base
 * configuration (e.g., same version) but different names.
 *
 * @example
 * ```ts
 * const tracerFactory = createTracerFactory({ version: '1.0.0' });
 *
 * const agentTracer = tracerFactory('agent_builder/agent');
 * const toolTracer = tracerFactory('agent_builder/tools');
 * const runnerTracer = tracerFactory('agent_builder/runner');
 * ```
 */
export function createTracerFactory(
  baseOptions: Omit<CreateTracerOptions, 'name'> = {}
): (name?: string) => Tracer {
  return (name?: string) => {
    return createTracer({
      ...baseOptions,
      name: name ?? AGENT_BUILDER_TRACER_NAME,
    });
  };
}

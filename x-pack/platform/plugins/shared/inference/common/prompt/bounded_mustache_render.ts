/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Mustache from 'mustache';
import { MustacheRenderLimitError } from './mustache_render_limit_error';

/** Bounds on a single render. Overridable so tests can trip a limit with small inputs. */
export interface MustacheRenderLimits {
  /** Max render passes charged; each section iteration counts, so this caps total work. */
  maxOperations?: number;
  /** Max characters the render may emit, bounding memory for small templates with large output. */
  maxOutputLength?: number;
  /** Max section nesting, keeping the render off a stack overflow and bounding context lookups. */
  maxDepth?: number;
}

const DEFAULT_LIMITS: Required<MustacheRenderLimits> = {
  maxOperations: 1_000_000,
  maxOutputLength: 1_000_000,
  maxDepth: 100,
};

class BoundedWriter extends Mustache.Writer {
  private operations = 0;
  private outputLength = 0;
  private depth = 0;

  constructor(private readonly limits: Required<MustacheRenderLimits>) {
    super();
  }

  private chargeOperations(tokenCount: number): void {
    // Charge one per pass on top of the tokens so an empty section body still costs something:
    // Mustache re-enters this method once per array element even when the body emits nothing.
    this.operations += tokenCount + 1;
    if (this.operations > this.limits.maxOperations) {
      throw new MustacheRenderLimitError(
        `Template exceeds the maximum render complexity of ${this.limits.maxOperations} operations.`
      );
    }
  }

  private chargeOutput(value: unknown): void {
    // Mustache skips `undefined`/`null` values and coerces everything else with `String` before
    // appending, so measure the coerced text rather than a raw `.length` (which is wrong, or
    // absent, for numbers, booleans, and arrays).
    if (value === undefined || value === null) {
      return;
    }
    this.outputLength += typeof value === 'string' ? value.length : String(value).length;
    if (this.outputLength > this.limits.maxOutputLength) {
      throw new MustacheRenderLimitError(
        `Template exceeds the maximum rendered length of ${this.limits.maxOutputLength} characters.`
      );
    }
  }

  renderTokens(
    tokens: string[][],
    context: Mustache.Context,
    partials?: Parameters<Mustache.Writer['renderTokens']>[2],
    originalTemplate?: string,
    config?: Parameters<Mustache.Writer['renderTokens']>[4]
  ): string {
    this.chargeOperations(tokens.length);
    this.depth += 1;
    if (this.depth > this.limits.maxDepth) {
      throw new MustacheRenderLimitError(
        `Template exceeds the maximum section nesting depth of ${this.limits.maxDepth}.`
      );
    }
    try {
      return super.renderTokens(tokens, context, partials, originalTemplate, config);
    } finally {
      this.depth -= 1;
    }
  }

  unescapedValue(token: string[], context: Mustache.Context): string {
    const value = super.unescapedValue(token, context);
    this.chargeOutput(value);
    return value;
  }

  escapedValue(
    token: string[],
    context: Mustache.Context,
    config?: Parameters<Mustache.Writer['escapedValue']>[2]
  ): string {
    const value = super.escapedValue(token, context, config);
    this.chargeOutput(value);
    return value;
  }

  rawValue(token: string[]): string {
    const value = super.rawValue(token);
    this.chargeOutput(value);
    return value;
  }
}

/**
 * Renders a Mustache template with bounded work, output, and nesting so caller-supplied templates
 * cannot stall the event loop or exhaust memory. Throws `MustacheRenderLimitError` when a limit is
 * hit.
 *
 * A fresh writer is used per call so these templates do not populate Mustache's process-global
 * template cache, which is never evicted.
 */
export function renderBoundedMustache(
  template: string,
  view: unknown,
  limits: MustacheRenderLimits = {}
): string {
  return new BoundedWriter({ ...DEFAULT_LIMITS, ...limits }).render(template, view);
}

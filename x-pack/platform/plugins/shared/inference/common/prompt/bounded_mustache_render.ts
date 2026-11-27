/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Mustache from 'mustache';
import { MustacheRenderLimitError } from './mustache_render_limit_error';

/** Nested sections multiply the token count, so we cap it to fail fast on exponential templates. */
const MAX_RENDER_TOKENS = 1_000_000;

/**
 * Catches templates which use few tokens, but still build a huge string, like a big value repeated over
 * a large array.
 */
const MAX_OUTPUT_LENGTH = 1_000_000;

class BoundedWriter extends Mustache.Writer {
  private tokensProcessed = 0;
  private outputLength = 0;

  private countTokens(count: number) {
    this.tokensProcessed += count;
    if (this.tokensProcessed > MAX_RENDER_TOKENS) {
      throw new MustacheRenderLimitError(
        `Template exceeds the maximum render complexity of ${MAX_RENDER_TOKENS} operations.`
      );
    }
  }

  private countOutput(value: string): string {
    this.outputLength += value.length;
    if (this.outputLength > MAX_OUTPUT_LENGTH) {
      throw new MustacheRenderLimitError(
        `Template exceeds the maximum rendered length of ${MAX_OUTPUT_LENGTH} characters.`
      );
    }
    return value;
  }

  renderTokens(
    tokens: string[][],
    context: Mustache.Context,
    partials?: Parameters<Mustache.Writer['renderTokens']>[2],
    originalTemplate?: string,
    config?: Parameters<Mustache.Writer['renderTokens']>[4]
  ): string {
    this.countTokens(tokens.length);
    return super.renderTokens(tokens, context, partials, originalTemplate, config);
  }

  unescapedValue(token: string[], context: Mustache.Context): string {
    return this.countOutput(super.unescapedValue(token, context));
  }

  escapedValue(
    token: string[],
    context: Mustache.Context,
    config?: Parameters<Mustache.Writer['escapedValue']>[2]
  ): string {
    return this.countOutput(super.escapedValue(token, context, config));
  }

  rawValue(token: string[]): string {
    return this.countOutput(super.rawValue(token));
  }
}

/**
 * Renders a Mustache template so caller-supplied templates can't stall the event loop or exhaust
 * memory. Throws `MustacheRenderLimitError` when a limit is hit.
 */
export function renderBoundedMustache(template: string, view: unknown): string {
  // A fresh writer keeps these templates out of Mustache's global cache, which is never evicted.
  return new BoundedWriter().render(template, view);
}

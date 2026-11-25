/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Context, Emitter, Liquid, Parser, Tag, TagToken, TopLevelToken } from 'liquidjs';

/**
 * Makes the tags of the engine that write a value escape it the way `{{ }}` does.
 *
 * liquidjs applies `outputEscape` only to `{{ }}`: `echo` (also as a line of a `liquid` block) and
 * `cycle` write the value as it is, as markup. Each tag named here is replaced by a wrapper around
 * the engine's own: it parses and runs as the original does, so a template that used the tag keeps
 * rendering, and whatever the original writes, or returns for the renderer to write (`cycle` does),
 * is escaped with the same filter `{{ }}` uses, called as the engine calls a filter.
 *
 * `TagBase` is the `Tag` class of the engine, which is loaded on demand and so comes from the caller.
 */
export const registerEscapedTags = (
  liquid: Liquid,
  TagBase: typeof Tag,
  names: readonly string[]
): void => {
  const { outputEscape } = liquid.options;
  // Without it the wrapper would have nothing to escape with, and the tags would stay raw.
  if (!outputEscape)
    throw new Error('The engine needs `outputEscape` to escape what a tag writes.');
  // Narrowed once here: a class below cannot see the narrowing of a variable of this function.
  const escape: NonNullable<typeof outputEscape> = outputEscape;

  names.forEach((name) => {
    const OriginalTag = liquid.tags[name];
    // A tag this version of the engine does not have cannot be written by a template either.
    if (!OriginalTag) return;

    class EscapedTag extends TagBase {
      private readonly original: Tag;

      constructor(token: TagToken, remainTokens: TopLevelToken[], engine: Liquid, parser: Parser) {
        super(token, remainTokens, engine);
        this.original = new OriginalTag(token, remainTokens, engine, parser);
      }

      *render(ctx: Context, emitter: Emitter): Generator<unknown, unknown, unknown> {
        // A filter of the engine runs with the context as `this`, which the escape reads.
        const escapeAsOutput = (value: unknown): string => escape.call({ context: ctx }, value);
        const escaping: Emitter = Object.create(emitter);
        escaping.write = (html: unknown) => emitter.write(escapeAsOutput(html));
        const returned = yield this.original.render(ctx, escaping);
        // What a tag returns is written by the renderer, so it is escaped too. Nothing, or a falsy
        // value that the renderer would skip, is left as it is.
        return returned ? escapeAsOutput(returned) : returned;
      }
    }

    liquid.registerTag(name, EscapedTag);
  });
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensApp } from '@kbn/scout';

/**
 * Constraint used by every `withLens*` mixin below: each mixin adds Lens-editor-only
 * methods onto a class that already extends (directly or via other mixins) the shared,
 * cross-plugin `LensApp` from `@kbn/scout`.
 *
 * The `any[]` rest parameter is mandated by TypeScript itself (TS2545: "A mixin class must
 * have a constructor with a single rest parameter of type 'any[]'") — every constructible
 * mixin base in TS is required to be typed exactly this way, regardless of the concrete
 * constructor signature of `T`. There is no narrower type that satisfies this constraint.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LensAppConstructor<T extends LensApp = LensApp> = new (...args: any[]) => T;

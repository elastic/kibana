/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RetentionOption {
  /** Unique identifier and display title for the row. */
  name: string;
  /**
   * Optional method/category key used by `RetentionSelector`'s `methodFilter`.
   *
   * The selector itself is agnostic to what the key means (e.g. "ilm", "dlm",
   * "hot", "warm", etc.) — callers define the semantics.
   */
  method?: string;
  /**
   * Optional category prefix, rendered as:
   * `${descriptionCategory}: ${descriptionParts.join(' · ')}`
   */
  descriptionCategory?: string;
  /**
   * Parts joined with ' · ' as the row's subdued description line.
   * When omitted, the description line will render as empty (or just the category prefix).
   */
  descriptionParts?: string[];
  /**
   * Optional second description line, rendered below `descriptionParts`.
   * Parts are joined with ' · ' and can have their own category prefix.
   */
  descriptionCategorySecondLine?: string;
  descriptionPartsSecondLine?: string[];
  /**
   * When set, renders the Streams ILM inspect badge (together with the inspect action)
   * when `inspectPlacement="badge"`.
   */
  badge?: string;
  /** When true, renders an inspect button on the row. */
  inspectable?: boolean;
}

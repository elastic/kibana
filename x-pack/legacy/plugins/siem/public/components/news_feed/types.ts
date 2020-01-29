/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * For rendering, `RawNewsApiItem`s are transformed to this
 * representation of a news item
 */
export interface NewsItem {
  description: string;
  expireOn: Date;
  hash: string;
  imageUrl: string | null;
  linkUrl: string;
  publishOn: Date;
  title: string;
}

/**
 * The raw (wire format) representation of a News API item
 */
export interface RawNewsApiItem {
  badge?: { [lang: string]: string | null } | null;
  description?: { [lang: string]: string | null } | null;
  expire_on?: Date | null;
  hash?: string | null;
  image_url?: { [lang: string]: string | null } | null;
  languages?: string[] | null;
  link_text?: { [lang: string]: string | null } | null;
  link_url?: { [lang: string]: string | null } | null;
  publish_on?: Date | null;
  title?: { [lang: string]: string } | null;
}

/**
 * Defines the shape of a raw response from the News API
 */
export interface RawNewsApiResponse {
  items?: RawNewsApiItem[] | null;
}

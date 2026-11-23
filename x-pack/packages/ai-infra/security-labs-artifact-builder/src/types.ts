/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Configuration for the Security Labs artifact builder.
 */
export interface TaskConfig {
  /** Artifact version (`YYYY.MM.DD-HHMMSS` UTC; legacy `YYYY.MM.DD` still accepted) */
  version: string;
  /** Folder for temporary build files */
  buildFolder: string;
  /** Folder to output the final artifact */
  targetFolder: string;
  /** URL of the Elasticsearch cluster for generating embeddings */
  embeddingClusterUrl: string;
  /** Username for the embedding cluster */
  embeddingClusterUsername: string;
  /** Password for the embedding cluster */
  embeddingClusterPassword: string;
  /** Contentstack Content Delivery API host for the Security Labs stack (e.g. `cdn.contentstack.io`). */
  contentstackHost: string;
  /** API key of the Contentstack stack that hosts Security Labs (required unless `localContentPath` is set). */
  contentstackApiKey?: string;
  /** Read-only Contentstack delivery token (required unless `localContentPath` is set). */
  contentstackDeliveryToken?: string;
  /** Contentstack publishing environment to read published entries from. */
  contentstackEnvironment: string;
  /** Contentstack locale to read entries in. */
  contentstackLocale: string;
  /** Contentstack content type UIDs whose published entries are indexed. */
  contentstackContentTypes: string[];
  /** Local path to Security Labs markdown content (alternative to the Contentstack fetch) */
  localContentPath?: string;
  /** Inference endpoint used to generate the semantic_text embeddings. */
  inferenceId: string;
}

/**
 * Parsed Security Labs document from markdown with frontmatter.
 */
export interface SecurityLabsDocument {
  /** Article title from frontmatter */
  title: string;
  /** URL slug from frontmatter */
  slug: string;
  /** Publication date from frontmatter (ISO 8601) */
  date: string;
  /** Article description/summary from frontmatter */
  description: string;
  /** Author slugs from frontmatter */
  authors: string[];
  /** Category slugs from frontmatter */
  categories: string[];
  /** Full markdown content (body without frontmatter) */
  content: string;
  /** Source file path */
  sourceFile: string;
}

/**
 * Document structure for indexing into Elasticsearch.
 */
export interface IndexedSecurityLabsDocument {
  /** Article title */
  title: string;
  /** URL slug */
  slug: string;
  /** Publication date */
  date: string;
  /** Article description */
  description: string;
  /** Authors (joined as string) */
  authors: string;
  /** Categories as keywords */
  categories: string[];
  /** Full content for semantic search */
  content: string;
  /** Resource type identifier */
  resource_type: 'security_labs';
}

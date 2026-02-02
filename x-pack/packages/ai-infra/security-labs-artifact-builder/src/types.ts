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
  /** Date-based version in YYYY.MM.DD format */
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
  /** GitHub repository URL for Security Labs content (stub: SECURITY_LABS_REPO) */
  githubRepoUrl: string;
  /** GitHub token for accessing the repository */
  githubToken?: string;
  /** Local path to Security Labs content (alternative to GitHub fetch) */
  localContentPath?: string;
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

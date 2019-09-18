/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DetailSymbolInformation } from '@elastic/lsp-extension';
import { IRange } from 'monaco-editor';

import { DiffKind } from '../common/git_diff';
import { Repository, SourceHit } from '../model';
import { RepositoryUri } from './repository';

export interface Document {
  repoUri: RepositoryUri;
  path: string;
  content: string;
  qnames: string[];
  language?: string;
  sha1?: string;
}

export interface Commit {
  repoUri: RepositoryUri;
  id: string;
  message: string;
  body: string;
  date: Date;
  parents: string[];
  author: {
    name: string;
    email: string;
  };
  committer: {
    name: string;
    email: string;
  };
}

// The base interface of indexer requests
export interface IndexRequest {
  repoUri: RepositoryUri;
}

export enum IndexerType {
  LSP = 'LSP',
  LSP_INC = 'LSP_INCREMENTAL',
  COMMIT = 'COMMIT',
  COMMIT_INC = 'COMMIT_INCREMENTAL',
  REPOSITORY = 'REPOSITORY',
  UNKNOWN = 'UNKNOWN',
}

// The request for LspIndexer
export interface LspIndexRequest extends IndexRequest {
  filePath: string; // The file path within the repository
  revision: string; // The revision of the current repository
}

// The request for CommitIndexer
export interface CommitIndexRequest extends IndexRequest {
  // The git ref as the starting point for the entire commit index job.
  revision: string;
  commit: Commit;
}

export interface LspIncIndexRequest extends LspIndexRequest {
  originPath?: string;
  kind: DiffKind;
  originRevision: string;
}

// The request for RepositoryIndexer
export interface RepositoryIndexRequest extends IndexRequest {
  repoUri: RepositoryUri;
}

// The base interface of any kind of search requests.
export interface SearchRequest {
  query: string;
  page: number;
  resultsPerPage?: number;
}

export interface RepositorySearchRequest extends SearchRequest {
  query: string;
  repoScope?: RepositoryUri[];
}

export interface DocumentSearchRequest extends SearchRequest {
  // repoFilters is used for search within these repos but return
  // search stats across all repositories.
  repoFilters?: string[];
  // repoScope hard limit the search coverage only to these repositories.
  repoScope?: RepositoryUri[];
  langFilters?: string[];
}

export interface CommitSearchRequest extends SearchRequest {
  // repoFilters is used for search within these repos but return
  // search stats across all repositories.
  repoFilters?: string[];
  // repoScope hard limit the search coverage only to these repositories.
  repoScope?: RepositoryUri[];
}

export interface SymbolSearchRequest extends SearchRequest {
  query: string;
  repoScope?: RepositoryUri[];
}

export interface CodeIntegrationRequest {
  repoUris: RepositoryUri[];
  revision?: string;
}

export interface ResolveSnippetsIntegrationRequest extends CodeIntegrationRequest {
  filePath: string;
  lineNumStart: number;
  lineNumEnd?: number;
}

// The base interface of any kind of search result.
export interface SearchResult {
  total: number;
  took: number;
}

export interface RepositorySearchResult extends SearchResult {
  repositories: Repository[];
  from?: number;
  page?: number;
  totalPage?: number;
}

export interface SymbolSearchResult extends SearchResult {
  // TODO: we might need an additional data structure for symbol search result.
  symbols: DetailSymbolInformation[];
}

// All the interfaces for search page

// The item of the search result stats. e.g. Typescript -> 123
export interface SearchResultStatsItem {
  name: string;
  value: number;
}

export interface SearchResultStats {
  total: number; // Total number of results
  from: number; // The beginning of the result range
  to: number; // The end of the result range
  page: number; // The page number
  totalPage: number; // The total number of pages
  repoStats: SearchResultStatsItem[];
  languageStats: SearchResultStatsItem[];
}

export interface CompositeSourceContent {
  content: string;
  lineMapping: string[];
  ranges: IRange[];
}

export interface SearchResultItem {
  uri: string;
  hits: number;
  filePath: string;
  language: string;
  compositeContent: CompositeSourceContent;
}

export interface DocumentSearchResult extends SearchResult {
  query: string;
  from?: number;
  page?: number;
  totalPage?: number;
  stats?: SearchResultStats;
  results?: SearchResultItem[];
  repoAggregations?: any[];
  langAggregations?: any[];
}

export type CommitSearchResultItem = Commit;

export interface CommitSearchResult extends DocumentSearchResult {
  commits: CommitSearchResultItem[];
}

export interface IntegrationsSearchResult extends SearchResult {
  results?: SearchResultItem[];
  fallback: boolean;
}

export interface SourceLocation {
  line: number;
  column: number;
  offset: number;
}

export interface SourceRange {
  startLoc: SourceLocation;
  endLoc: SourceLocation;
}

export interface SourceHit {
  range: SourceRange;
  score: number;
  term: string;
}

export enum SearchScope {
  DEFAULT = 'default', // Search everything
  SYMBOL = 'symbol', // Only search symbols
  REPOSITORY = 'repository', // Only search repositories
  FILE = 'file', // Only search files
}

export interface SearchOptions {
  repoScope: Repository[];
  defaultRepoScopeOn: boolean;
  defaultRepoScope?: Repository;
}

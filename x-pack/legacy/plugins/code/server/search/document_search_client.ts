/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRange } from 'monaco-editor';
import { LineMapper } from '../../common/line_mapper';
import {
  Document,
  DocumentSearchRequest,
  DocumentSearchResult,
  SearchResultItem,
  SourceHit,
  SourceRange,
} from '../../model';
import { DocumentIndexNamePrefix, DocumentSearchIndexWithScope } from '../indexer/schema';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import {
  expandRanges,
  extractSourceContent,
  LineMapping,
  LineRange,
  mergeRanges,
} from '../utils/composite_source_merger';
import { AbstractSearchClient } from './abstract_search_client';

const HIT_MERGE_LINE_INTERVAL = 2; // Inclusive
const MAX_HIT_NUMBER = 5;

export class DocumentSearchClient extends AbstractSearchClient {
  private HIGHLIGHT_TAG = '_@_';
  private LINE_SEPARATOR = '\n';

  constructor(protected readonly client: EsClient, protected readonly log: Logger) {
    super(client, log);
  }

  public async search(req: DocumentSearchRequest): Promise<DocumentSearchResult> {
    const resultsPerPage = this.getResultsPerPage(req);
    const from = (req.page - 1) * resultsPerPage;
    const size = resultsPerPage;

    // The query to search qname field.
    const qnameQuery = {
      constant_score: {
        filter: {
          match: {
            qnames: {
              query: req.query,
              operator: 'OR',
              prefix_length: 0,
              max_expansions: 50,
              fuzzy_transpositions: true,
              lenient: false,
              zero_terms_query: 'NONE',
              boost: 1.0,
            },
          },
        },
        boost: 1.0,
      },
    };

    // The query to search content and path filter.
    const contentAndPathQuery = {
      simple_query_string: {
        query: req.query,
        fields: ['content^1.0', 'path^1.0'],
        default_operator: 'or',
        lenient: false,
        analyze_wildcard: false,
        boost: 1.0,
      },
    };

    // Post filters for repository
    let repositoryPostFilters: object[] = [];
    if (req.repoFilters) {
      repositoryPostFilters = req.repoFilters.map((repoUri: string) => {
        return {
          term: {
            repoUri,
          },
        };
      });
    }

    // Post filters for language
    let languagePostFilters: object[] = [];
    if (req.langFilters) {
      languagePostFilters = req.langFilters.map((lang: string) => {
        return {
          term: {
            language: lang,
          },
        };
      });
    }

    const index = req.repoScope
      ? DocumentSearchIndexWithScope(req.repoScope)
      : `${DocumentIndexNamePrefix}*`;

    const rawRes = await this.client.search({
      index,
      body: {
        from,
        size,
        query: {
          bool: {
            should: [qnameQuery, contentAndPathQuery],
            disable_coord: false,
            adjust_pure_negative: true,
            boost: 1.0,
          },
        },
        post_filter: {
          bool: {
            must: [
              {
                bool: {
                  should: repositoryPostFilters,
                  disable_coord: false,
                  adjust_pure_negative: true,
                  boost: 1.0,
                },
              },
              {
                bool: {
                  should: languagePostFilters,
                  disable_coord: false,
                  adjust_pure_negative: true,
                  boost: 1.0,
                },
              },
            ],
            disable_coord: false,
            adjust_pure_negative: true,
            boost: 1.0,
          },
        },
        aggregations: {
          repoUri: {
            terms: {
              field: 'repoUri',
              size: 10,
              min_doc_count: 1,
              shard_min_doc_count: 0,
              show_term_doc_count_error: false,
              order: [
                {
                  _count: 'desc',
                },
                {
                  _key: 'asc',
                },
              ],
            },
          },
          language: {
            terms: {
              field: 'language',
              size: 10,
              min_doc_count: 1,
              shard_min_doc_count: 0,
              show_term_doc_count_error: false,
              order: [
                {
                  _count: 'desc',
                },
                {
                  _key: 'asc',
                },
              ],
            },
          },
        },
        highlight: {
          // TODO: we might need to improve the highlighting separator.
          pre_tags: [this.HIGHLIGHT_TAG],
          post_tags: [this.HIGHLIGHT_TAG],
          fields: {
            content: {},
            path: {},
          },
        },
      },
    });

    const hits: any[] = rawRes.hits.hits;
    const aggregations = rawRes.aggregations;
    const results: SearchResultItem[] = hits.map(hit => {
      const doc: Document = hit._source;
      const { repoUri, path, language } = doc;

      const highlight = hit.highlight;
      // Similar to https://github.com/lambdalab/lambdalab/blob/master/services/liaceservice/src/main/scala/com/lambdalab/liaceservice/LiaceServiceImpl.scala#L147
      // Might need refactoring.
      const highlightContent: string[] = highlight.content;
      let termContent: string[] = [];
      if (highlightContent) {
        highlightContent.forEach((c: string) => {
          termContent = termContent.concat(this.extractKeywords(c));
        });
      }
      const hitsContent = this.termsToHits(doc.content, termContent);
      const sourceContent = this.getSourceContent(hitsContent, doc);
      const item: SearchResultItem = {
        uri: repoUri,
        filePath: path,
        language: language!,
        hits: hitsContent.length,
        compositeContent: sourceContent,
      };
      return item;
    });
    const total = rawRes.hits.total.value;
    return {
      query: req.query,
      from,
      page: req.page,
      totalPage: Math.ceil(total / resultsPerPage),
      results,
      repoAggregations: aggregations.repoUri.buckets,
      langAggregations: aggregations.language.buckets,
      took: rawRes.took,
      total,
    };
  }

  public async suggest(req: DocumentSearchRequest): Promise<DocumentSearchResult> {
    const resultsPerPage = this.getResultsPerPage(req);
    const from = (req.page - 1) * resultsPerPage;
    const size = resultsPerPage;

    const index = req.repoScope
      ? DocumentSearchIndexWithScope(req.repoScope)
      : `${DocumentIndexNamePrefix}*`;

    const queryStr = req.query.toLowerCase();

    const rawRes = await this.client.search({
      index,
      body: {
        from,
        size,
        query: {
          bool: {
            should: [
              {
                prefix: {
                  'path.hierarchy': {
                    value: queryStr,
                    boost: 1.0,
                  },
                },
              },
              {
                term: {
                  'path.hierarchy': {
                    value: queryStr,
                    boost: 10.0,
                  },
                },
              },
            ],
            disable_coord: false,
            adjust_pure_negative: true,
            boost: 1.0,
          },
        },
      },
    });

    const hits: any[] = rawRes.hits.hits;
    const results: SearchResultItem[] = hits.map(hit => {
      const doc: Document = hit._source;
      const { repoUri, path, language } = doc;

      const item: SearchResultItem = {
        uri: repoUri,
        filePath: path,
        language: language!,
        hits: 0,
        compositeContent: {
          content: '',
          lineMapping: [],
          ranges: [],
        },
      };
      return item;
    });
    const total = rawRes.hits.total.value;
    return {
      query: req.query,
      from,
      page: req.page,
      totalPage: Math.ceil(total / resultsPerPage),
      results,
      took: rawRes.took,
      total,
    };
  }

  private getSourceContent(hitsContent: SourceHit[], doc: Document) {
    const docInLines = doc.content.split(this.LINE_SEPARATOR);
    let slicedRanges: LineRange[] = [];
    if (hitsContent.length === 0) {
      // Always add a placeholder range of the first line so that for filepath
      // matching search result, we will render some file content.
      slicedRanges = [
        {
          startLine: 0,
          endLine: 0,
        },
      ];
    } else {
      const slicedHighlights = hitsContent.slice(0, MAX_HIT_NUMBER);
      slicedRanges = slicedHighlights.map(hit => ({
        startLine: hit.range.startLoc.line,
        endLine: hit.range.endLoc.line,
      }));
    }

    const expandedRanges = expandRanges(slicedRanges, HIT_MERGE_LINE_INTERVAL);
    const mergedRanges = mergeRanges(expandedRanges);
    const lineMapping = new LineMapping();
    const result = extractSourceContent(mergedRanges, docInLines, lineMapping);
    const ranges: IRange[] = hitsContent
      .filter(hit => lineMapping.hasLine(hit.range.startLoc.line))
      .map(hit => ({
        startColumn: hit.range.startLoc.column + 1,
        startLineNumber: lineMapping.lineNumber(hit.range.startLoc.line),
        endColumn: hit.range.endLoc.column + 1,
        endLineNumber: lineMapping.lineNumber(hit.range.endLoc.line),
      }));
    return {
      content: result.join(this.LINE_SEPARATOR),
      lineMapping: lineMapping.toStringArray(),
      ranges,
    };
  }

  private termsToHits(source: string, terms: string[]): SourceHit[] {
    const filteredTerms = terms.filter(t => t.trim().length > 0);
    if (filteredTerms.length === 0) {
      return [];
    }

    const lineMapper = new LineMapper(source);
    const regex = new RegExp(`(${filteredTerms.join('|')})`, 'g');
    let match;
    const hits: SourceHit[] = [];
    do {
      match = regex.exec(source);
      if (match) {
        const begin = match.index;
        const end = regex.lastIndex;
        const startLoc = lineMapper.getLocation(begin);
        const endLoc = lineMapper.getLocation(end);
        const range: SourceRange = {
          startLoc,
          endLoc,
        };
        const hit: SourceHit = {
          range,
          score: 0.0,
          term: match[1],
        };
        hits.push(hit);
      }
    } while (match);
    return hits;
  }

  private extractKeywords(text: string | null): string[] {
    if (!text) {
      return [];
    } else {
      const keywordRegex = new RegExp(`${this.HIGHLIGHT_TAG}(\\w*)${this.HIGHLIGHT_TAG}`, 'g');
      const keywords = text.match(keywordRegex);
      if (keywords) {
        return keywords.map((k: string) => {
          return k.replace(new RegExp(this.HIGHLIGHT_TAG, 'g'), '');
        });
      } else {
        return [];
      }
    }
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { groupBy, last } from 'lodash';
import { Location, Position } from 'vscode-languageserver-types';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { CTAGS, GO } from '../lsp/language_servers';
import {
  expandRanges,
  extractSourceContent,
  LineMapping,
  mergeRanges,
} from './composite_source_merger';
import { detectLanguage } from './detect_language';
import { parseLspUrl } from '../../common/uri_util';
import { GitServiceDefinition } from '../distributed/apis';

type SourceLoader = (
  loc: typeof GitServiceDefinition.blob.request
) => Promise<typeof GitServiceDefinition.blob.response>;

export interface File {
  repo: string;
  file: string;
  language: string;
  uri: string;
  revision: string;
  code: string;
  lineNumbers: number[];
  highlights: any[];
}

export interface GroupedFiles {
  [repo: string]: File[];
}

export async function groupFiles(
  list: Location[],
  sourceLoader: SourceLoader
): Promise<GroupedFiles> {
  const files = [];
  const groupedLocations = groupBy(list, 'uri');
  for (const url of Object.keys(groupedLocations)) {
    const { repoUri, revision, file } = parseLspUrl(url)!;
    const locations: Location[] = groupedLocations[url];
    const lines = locations.map(l => ({
      startLine: l.range.start.line,
      endLine: l.range.end.line,
    }));
    const ranges = expandRanges(lines, 1);
    const mergedRanges = mergeRanges(ranges);
    try {
      const blob = await sourceLoader({ uri: repoUri, path: file!, revision });
      if (blob.content) {
        const source = blob.content.split('\n');
        const language = blob.lang;
        const lineMappings = new LineMapping();
        const code = extractSourceContent(mergedRanges, source, lineMappings).join('\n');
        const lineNumbers = lineMappings.toStringArray();
        const highlights = locations.map(l => {
          const { start, end } = l.range;
          const startLineNumber = lineMappings.lineNumber(start.line);
          const endLineNumber = lineMappings.lineNumber(end.line);
          return {
            startLineNumber,
            startColumn: start.character + 1,
            endLineNumber,
            endColumn: end.character + 1,
          };
        });
        files.push({
          repo: repoUri,
          file,
          language,
          uri: url,
          revision,
          code,
          lineNumbers,
          highlights,
        });
      }
    } catch (e) {
      // can't load this file, ignore this result
    }
  }
  return (groupBy(files, 'repo') as unknown) as GroupedFiles;
}

export async function findTitleFromHover(hover: ResponseMessage, uri: string, position: Position) {
  let title: string;
  if (hover.result && hover.result.contents) {
    if (Array.isArray(hover.result.contents)) {
      const content = hover.result.contents[0];
      title = hover.result.contents[0].value;
      const lang = await detectLanguage(uri.replace('file://', ''));
      // TODO(henrywong) Find a gernal approach to construct the reference title.
      if (content.kind) {
        // The format of the hover result is 'MarkupContent', extract appropriate pieces as the references title.
        if (GO.languages.includes(lang)) {
          title = title.substring(title.indexOf('```go\n') + 5, title.lastIndexOf('\n```'));
          if (title.includes('{\n')) {
            title = title.substring(0, title.indexOf('{\n'));
          }
        }
      } else if (CTAGS.languages.includes(lang)) {
        // There are language servers may provide hover results with markdown syntax, like ctags-langserver,
        // extract the plain text.
        if (title.substring(0, 2) === '**' && title.includes('**\n')) {
          title = title.substring(title.indexOf('**\n') + 3);
        }
      }
    } else {
      title = hover.result.contents as 'string';
    }
  } else {
    title = last(uri.split('/')) + `(${position.line}, ${position.character})`;
  }
  return title;
}

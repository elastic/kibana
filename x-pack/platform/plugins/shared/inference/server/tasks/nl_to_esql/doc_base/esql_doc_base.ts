/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { loadData, type EsqlDocData, type EsqlDocEntry } from './load_data';
import { tryResolveAlias } from './aliases';
import { getSuggestions } from './suggestions';
import type { GetDocsOptions } from './types';

const loadDataOnce = once(loadData);

const overviewEntries = ['SYNTAX', 'OVERVIEW', 'OPERATORS'];

export class EsqlDocumentBase {
  private systemMessage: string;
  private docRecords: Record<string, EsqlDocEntry>;

  static async load(): Promise<EsqlDocumentBase> {
    const data = await loadDataOnce();
    return new EsqlDocumentBase(data);
  }

  constructor(rawData: EsqlDocData) {
    this.systemMessage = rawData.systemMessage;
    this.docRecords = rawData.docs;
  }

  getSystemMessage() {
    return this.systemMessage;
  }

  getDocumentation(
    rawKeywords: string[],
    {
      generateMissingKeywordDoc = true,
      addSuggestions = true,
      addOverview = true,
      resolveAliases = true,
    }: GetDocsOptions = {}
  ) {
    const keywords = rawKeywords.map((raw) => {
      // LOOKUP JOIN  has space so we want to retain as is
      let keyword = raw.toLowerCase().includes('join') ? raw : format(raw);
      if (resolveAliases) {
        keyword = tryResolveAlias(keyword);
      }
      return keyword;
    });

    if (addSuggestions) {
      keywords.push(...getSuggestions(keywords));
    }

    if (addOverview) {
      keywords.push(...overviewEntries);
    }

    return [...new Set(keywords)].reduce<Record<string, string>>((results, keyword) => {
      if (Object.hasOwn(this.docRecords, keyword)) {
        results[keyword] = this.docRecords[keyword].data;
      } else if (generateMissingKeywordDoc) {
        results[keyword] = createDocForUnknownKeyword(keyword);
      }
      return results;
    }, {});
  }
}

const format = (keyword: string) => {
  return keyword.replaceAll(' ', '').toUpperCase();
};

const createDocForUnknownKeyword = (keyword: string) => {
  return `
  ## ${keyword}

  There is no ${keyword} function or command in ES|QL. Do NOT use it.
  `;
};

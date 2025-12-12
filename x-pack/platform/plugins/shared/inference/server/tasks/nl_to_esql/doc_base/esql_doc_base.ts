/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';
import { loadData, type EsqlDocData, type EsqlDocEntry, type EsqlPrompts } from './load_data';
import { tryResolveAlias } from './aliases';
import { getSuggestions } from './suggestions';
import type { GetDocsOptions } from './types';

const loadDataOnce = once(loadData);

export class EsqlDocumentBase {
  private prompts: EsqlPrompts;
  private docRecords: Record<string, EsqlDocEntry>;

  static async load(): Promise<EsqlDocumentBase> {
    const data = await loadDataOnce();
    return new EsqlDocumentBase(data);
  }

  constructor(rawData: EsqlDocData) {
    this.prompts = rawData.prompts;
    this.docRecords = rawData.docs;
  }

  getPrompts(): EsqlPrompts {
    return this.prompts;
  }

  /** @deprecated use individual prompts instead */
  getSystemMessage(): string {
    return `${this.prompts.syntax}

    ${this.prompts.examples}
    `;
  }

  getDocumentation(
    rawKeywords: string[],
    {
      generateMissingKeywordDoc = true,
      addSuggestions = true,
      resolveAliases = true,
    }: GetDocsOptions = {}
  ) {
    const keywords = rawKeywords.map((raw) => {
      let keyword = format(raw);
      if (resolveAliases) {
        keyword = tryResolveAlias(keyword);
      }
      return keyword;
    });

    if (addSuggestions) {
      keywords.push(...getSuggestions(keywords));
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

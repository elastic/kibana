/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { npStart } from 'ui/new_platform';
import { RestAPIAdapter } from '../rest_api/adapter_types';
import { ElasticsearchAdapter } from './adapter_types';
import { AutocompleteSuggestion, esKuery } from '../../../../../../../../src/plugins/data/public';

const getAutocompleteProvider = (language: string) =>
  npStart.plugins.data.autocomplete.getProvider(language);

export class RestElasticsearchAdapter implements ElasticsearchAdapter {
  private cachedIndexPattern: any = null;
  constructor(private readonly api: RestAPIAdapter, private readonly indexPatternName: string) {}

  public isKueryValid(kuery: string): boolean {
    try {
      esKuery.fromKueryExpression(kuery);
    } catch (err) {
      return false;
    }

    return true;
  }
  public async convertKueryToEsQuery(kuery: string): Promise<string> {
    if (!this.isKueryValid(kuery)) {
      return '';
    }
    const ast = esKuery.fromKueryExpression(kuery);
    const indexPattern = await this.getIndexPattern();
    return JSON.stringify(esKuery.toElasticsearchQuery(ast, indexPattern));
  }
  public async getSuggestions(
    kuery: string,
    selectionStart: any
  ): Promise<AutocompleteSuggestion[]> {
    const autocompleteProvider = getAutocompleteProvider('kuery');
    if (!autocompleteProvider) {
      return [];
    }
    const config = {
      get: () => true,
    };
    const indexPattern = await this.getIndexPattern();

    const getAutocompleteSuggestions = autocompleteProvider({
      config,
      indexPatterns: [indexPattern],
      boolFilter: null,
    });
    const results = getAutocompleteSuggestions({
      query: kuery || '',
      selectionStart,
      selectionEnd: selectionStart,
    });
    return results;
  }

  private async getIndexPattern() {
    if (this.cachedIndexPattern) {
      return this.cachedIndexPattern;
    }
    const res = await this.api.get<any>(`/api/index_patterns/_fields_for_wildcard`, {
      query: { pattern: this.indexPatternName },
    });
    if (isEmpty(res.fields)) {
      return;
    }
    this.cachedIndexPattern = {
      fields: res.fields,
      title: `${this.indexPatternName}`,
    };
    return this.cachedIndexPattern;
  }
}

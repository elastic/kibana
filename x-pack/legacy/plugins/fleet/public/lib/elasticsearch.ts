/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { autocomplete } from '../../../../../../src/plugins/data/public';
import { RestElasticsearchAdapter } from './adapters/elasticsearch/rest';

const HIDDEN_FIELDS = ['agents.actions'];

export class ElasticsearchLib {
  constructor(private readonly adapter: RestElasticsearchAdapter) {}

  public isKueryValid(kuery: string): boolean {
    return this.adapter.isKueryValid(kuery);
  }

  public async getSuggestions(
    kuery: string,
    selectionStart: any,
    fieldPrefix?: string
  ): Promise<autocomplete.QuerySuggestion[]> {
    const suggestions = await this.adapter.getSuggestions(kuery, selectionStart);

    const filteredSuggestions = suggestions.filter(suggestion => {
      if (suggestion.type === 'conjunction') {
        return true;
      }
      if (suggestion.type === 'value') {
        return true;
      }
      if (suggestion.type === 'operator') {
        return true;
      }

      if (fieldPrefix && suggestion.text.startsWith(fieldPrefix)) {
        for (const hiddenField of HIDDEN_FIELDS) {
          if (suggestion.text.startsWith(hiddenField)) {
            return false;
          }
        }
        return true;
      }

      return false;
    });

    return filteredSuggestions;
  }
}

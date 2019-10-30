/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AutocompleteSuggestion } from '../../../../../../src/plugins/data/public';
import { ElasticsearchAdapter } from './adapters/elasticsearch/adapter_types';

interface HiddenFields {
  op: 'is' | 'startsWith' | 'withoutPrefix';
  value: string;
}

export class ElasticsearchLib {
  private readonly hiddenFields: HiddenFields[] = [
    { op: 'startsWith', value: 'enrollment_token' },
    { op: 'is', value: 'beat.active' },
    { op: 'is', value: 'beat.enrollment_token' },
    { op: 'is', value: 'beat.access_token' },
    { op: 'is', value: 'beat.ephemeral_id' },
    { op: 'is', value: 'beat.verified_on' },
  ];

  constructor(private readonly adapter: ElasticsearchAdapter) {}

  public isKueryValid(kuery: string): boolean {
    return this.adapter.isKueryValid(kuery);
  }
  public async convertKueryToEsQuery(kuery: string): Promise<string> {
    return await this.adapter.convertKueryToEsQuery(kuery);
  }

  public async getSuggestions(
    kuery: string,
    selectionStart: any,
    fieldPrefix?: string
  ): Promise<AutocompleteSuggestion[]> {
    const suggestions = await this.adapter.getSuggestions(kuery, selectionStart);

    const filteredSuggestions = suggestions.filter(suggestion => {
      const hiddenFieldsCheck = this.hiddenFields;

      if (fieldPrefix) {
        hiddenFieldsCheck.push({
          op: 'withoutPrefix',
          value: `${fieldPrefix}.`,
        });
      }

      return hiddenFieldsCheck.reduce((isvalid: boolean, field) => {
        if (!isvalid) {
          return false;
        }

        switch (field.op) {
          case 'startsWith':
            return !suggestion.text.startsWith(field.value);
          case 'is':
            return suggestion.text.trim() !== field.value;
          case 'withoutPrefix':
            return suggestion.text.startsWith(field.value);
        }
      }, true);
    });

    return filteredSuggestions;
  }
}

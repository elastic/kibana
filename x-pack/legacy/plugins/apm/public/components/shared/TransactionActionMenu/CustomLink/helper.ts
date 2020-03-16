/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { get } from 'lodash';
import { Transaction } from '../../../../../../../../plugins/apm/typings/es_schemas/ui/transaction';

/*
 * Matches any string between {{}}.
 * e.g. http://www.elastic.co?service={{service}}&transaction={{transaction.id}}
 * Matches:
 *  - {{service}}
 *  - {{transaction.id}}
 */
const REGEX = /\{{(.*?)\}}/;

/**
 * Replaces variables specified between {{}} into the corresponding value.
 * e.g.:
 * url = http://www.elastic.co?service={{service}}&transaction={{transaction.id}}
 * transaction = {service: 'foo', transaction: {id: '123'}}
 * results: http://www.elastic.co?service=foo&transaction=123
 *
 * If no value is found returns empty for the matched variable.
 * url = http://www.elastic.co?service={{service}}&transaction={{transaction.id}}
 * transaction = {service: 'foo'}
 * results: http://www.elastic.co?service=foo&transaction=
 *
 * @param url
 * @param transaction
 */
export function replaceVariablesInUrl(url: string, transaction?: Transaction) {
  while (REGEX.test(url)) {
    const matched = REGEX.exec(url);
    if (matched) {
      const [variable, path] = matched;
      url = url.replace(
        variable,
        encodeURIComponent(get(transaction, path) || '')
      );
    }
  }
  return url;
}

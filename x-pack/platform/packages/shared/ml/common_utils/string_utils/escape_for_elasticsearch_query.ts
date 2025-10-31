/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Escapes reserved characters for use in Elasticsearch query terms.
export function escapeForElasticsearchQuery(str: string): string {
  // Escape with a leading backslash any of the characters that
  // Elastic document may cause a syntax error when used in queries:
  // + - = && || > < ! ( ) { } [ ] ^ " ~ * ? : \ /
  // https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html#_reserved_characters
  return String(str).replace(/[-[\]{}()+!<>=?:\/\\^"~*&|\s]/g, '\\$&');
}

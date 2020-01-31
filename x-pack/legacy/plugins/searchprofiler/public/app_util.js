/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Convert triple quotes into regular quotes and escape internal quotes.
function collapseLiteralStrings(data) {
  return data.replace(/"""(?:\s*\r?\n)?((?:.|\r?\n)*?)(?:\r?\n\s*)?"""/g, function(match, literal) {
    return JSON.stringify(literal);
  });
}

export function checkForParseErrors(json) {
  const sanitizedJson = collapseLiteralStrings(json);
  try {
    const parsedJson = JSON.parse(sanitizedJson);
    return { status: true, parsed: parsedJson };
  } catch (error) {
    return { status: false, error };
  }
}

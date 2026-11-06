/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

/**
 * Stands in for the ES|QL editor, which is a Monaco editor that cannot run under Jest. It takes
 * the props the plugin uses, and is a text area, so tests can type a query into it.
 *
 * Use it with: jest.mock('@kbn/esql/public', () => jest.requireActual('./fields/esql_editor.mock'))
 */
export const ESQLLangEditor = ({
  query,
  onTextLangQueryChange,
}: {
  query: { esql: string };
  onTextLangQueryChange: (query: { esql: string }) => void;
}) => (
  <textarea
    aria-label="ES|QL query editor"
    value={query.esql}
    onChange={(event) => onTextLangQueryChange({ esql: event.target.value })}
  />
);

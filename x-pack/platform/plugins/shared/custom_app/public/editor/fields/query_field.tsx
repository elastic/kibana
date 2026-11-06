/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getESQLQueryVariables } from '@kbn/esql-utils';
import { ESQLLangEditor } from '@kbn/esql/public';
import { ESQLVariableType, type ESQLControlVariable } from '@kbn/esql-types';
import type { StateDeclaration } from '@kbn/custom-app-common';

interface QueryFieldProps {
  query: string;
  /** The values of the app, which the query can use as `?name`. */
  state: Readonly<Record<string, StateDeclaration>>;
  onChange: (query: string) => void;
}

/** What the editor needs to suggest the app's values while a query is typed. */
const toVariables = (state: QueryFieldProps['state']): ESQLControlVariable[] =>
  Object.entries(state).flatMap(([key, declaration]) =>
    // The editor's variables are text or numbers; true and false have no place in them.
    declaration.type === 'boolean'
      ? []
      : [{ key, value: declaration.default, type: ESQLVariableType.VALUES }]
  );

/** The ?parameters a query uses, each marked by whether the app has a value of that name. */
const Parameters = ({ query, declared }: { query: string; declared: readonly string[] }) => {
  const names = Array.from(new Set(getESQLQueryVariables(query)));
  if (names.length === 0) return null;
  const undeclared = names.filter((name) => !declared.includes(name));

  return (
    <>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.customApp.editor.usesValues', { defaultMessage: 'Uses:' })}
          </EuiText>
        </EuiFlexItem>
        {names.map((name) => (
          <EuiFlexItem grow={false} key={name}>
            <EuiBadge color={declared.includes(name) ? 'success' : 'warning'}>{name}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      {undeclared.length > 0 && (
        <EuiText size="xs" color="subdued">
          <p>
            {i18n.translate('xpack.customApp.editor.undeclaredParams', {
              defaultMessage:
                '{count, plural, one {{names} is} other {{names} are}} not a value of this app. {count, plural, one {It works} other {They work}} only if a dashboard control provides {count, plural, one {it} other {them}}.',
              values: { count: undeclared.length, names: undeclared.join(', ') },
            })}
          </p>
        </EuiText>
      )}
    </>
  );
};

/** The ES|QL editor of a component that shows data, which is the query that describes its data. */
export const QueryField = ({ query, state, onChange }: QueryFieldProps) => (
  <div data-test-subj="customAppQueryField">
    <EuiTitle size="xxs">
      <h4>
        {i18n.translate('xpack.customApp.editor.queryTitle', { defaultMessage: 'ES|QL query' })}
      </h4>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <ESQLLangEditor
      query={{ esql: query }}
      onTextLangQueryChange={(next) => onChange(next.esql)}
      onTextLangQuerySubmit={async () => {}}
      editorIsInline
      hasOutline
      hideRunQueryButton
      hideQueryHistory
      disableAutoFocus
      initialState={{ editorHeight: 160 }}
      errors={[]}
      esqlVariables={toVariables(state)}
    />
    <Parameters query={query} declared={Object.keys(state)} />
  </div>
);

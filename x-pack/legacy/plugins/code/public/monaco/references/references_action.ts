/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { editor } from 'monaco-editor';
import queryString from 'querystring';
import url from 'url';
import { parseSchema } from '../../../common/uri_util';
import { history } from '../../utils/url';

export function registerReferencesAction(
  e: editor.IStandaloneCodeEditor,
  getUrlQuery: () => string
) {
  e.addAction({
    id: 'editor.action.referenceSearch.trigger',
    label: 'Find All References',
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1.5,
    run(ed: editor.ICodeEditor) {
      const position = ed.getPosition();
      const model = ed.getModel();
      if (model && position) {
        const { uri } = parseSchema(model.uri.toString());
        const refUrl = `git:/${uri}!L${position.lineNumber - 1}:${position.column - 1}`;
        const queries = url.parse(getUrlQuery(), true).query;
        const query = queryString.stringify({
          ...queries,
          tab: 'references',
          refUrl,
        });
        history.push(`${uri}?${query}`);
      }
    },
  });
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { action } from '@storybook/addon-actions';
import { storiesOf } from '@storybook/react';
import React from 'react';
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import { Editor } from '../editor';

import 'monaco-editor/esm/vs/basic-languages/html/html.contribution.js';

// A sample language definition with a few example tokens
const simpleLogLang: monacoEditor.languages.IMonarchLanguage = {
  tokenizer: {
    root: [
      [/\[error.*/, 'constant'],
      [/\[notice.*/, 'variable'],
      [/\[info.*/, 'string'],
      [/\[[a-zA-Z 0-9:]+\]/, 'tag'],
    ],
  },
};

monacoEditor.languages.register({ id: 'loglang' });
monacoEditor.languages.setMonarchTokensProvider('loglang', simpleLogLang);

const logs = `
[Sun Mar 7 20:54:27 2004] [notice] [client xx.xx.xx.xx] This is a notice!
[Sun Mar 7 20:58:27 2004] [info] [client xx.xx.xx.xx] (104)Connection reset by peer: client stopped connection before send body completed
[Sun Mar 7 21:16:17 2004] [error] [client xx.xx.xx.xx] File does not exist: /home/httpd/twiki/view/Main/WebHome
`;

const html = `<section>
  <span>Hello World!</span>
</section>`;

storiesOf('components/Editor', module)
  .add('default', () => (
    <div>
      <Editor languageId="plaintext" height={250} value="Hello!" onChange={action('onChange')} />
    </div>
  ))
  .add('html', () => (
    <div>
      <Editor languageId="html" height={250} value={html} onChange={action('onChange')} />
    </div>
  ))
  .add('custom log language', () => (
    <div>
      <Editor languageId="loglang" height={250} value={logs} onChange={action('onChange')} />
    </div>
  ));

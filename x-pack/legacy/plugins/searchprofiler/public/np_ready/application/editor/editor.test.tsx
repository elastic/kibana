/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import 'brace';
import 'brace/mode/json';

jest.mock('./worker', () => {
  return { workerModule: { id: 'ace/mode/json_worker', src: '' } };
});

import { registerTestBed } from '../../../../../../../test_utils';
import { Editor, Props } from '.';

describe('Editor Component', () => {
  it('renders', async () => {
    const props: Props = {
      initialValue: '',
      licenseEnabled: true,
      onEditorReady: e => {},
    };
    // Ignore the warning about Worker not existing for now...
    const init = registerTestBed(Editor);
    await init(props);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../../../../../test_utils';
import { searchResponse } from './fixtures/search_response';
import { ProfileTree, Props } from '../profile_tree';

describe('ProfileTree', () => {
  it('renders', async () => {
    const props: Props = {
      onHighlight: () => {},
      target: 'searches',
      data: searchResponse,
    };
    const init = registerTestBed(ProfileTree);
    await init(props);
  });

  it('does not throw despite bad profile data', async () => {
    // For now, ignore the console.error that gets logged.
    const props: Props = {
      onHighlight: () => {},
      target: 'searches',
      data: [{}] as any,
    };

    const init = registerTestBed(ProfileTree);
    await init(props);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../../../../../../../test_utils';
import { MappingsEditor } from '../../../mappings_editor';

export const setup = (props: any) =>
  registerTestBed(MappingsEditor, {
    memoryRouter: {
      wrapComponent: false,
    },
    defaultProps: props,
  })();

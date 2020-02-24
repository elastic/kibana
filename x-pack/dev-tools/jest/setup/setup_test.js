/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
  Global import, so we don't need to remember to import the lib in each file
  https://www.npmjs.com/package/jest-styled-components#global-installation
*/

import 'jest-styled-components';
import '@testing-library/jest-dom/extend-expect';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as testingLibraryDom from '@testing-library/dom';

testingLibraryDom.configure({
  testIdAttribute: 'data-test-subj',
});

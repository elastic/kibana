/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { queryHelpers } from '@testing-library/react';

/**
 * 'react-testing-library provides 'queryByTestId()' to get
 * elements with a 'data-testid' attribut. This custom method
 * supports querying for the Kibana style 'data-test-subj' attribute.
 * @param {HTMLElement} container The wrapping HTML element.
 * @param {Matcher} id The 'data-test-subj' id.
 * @returns {HTMLElement | null}
 */

export const queryByTestSubj = queryHelpers.queryByAttribute.bind(null, 'data-test-subj');

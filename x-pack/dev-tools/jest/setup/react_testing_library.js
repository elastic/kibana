/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '@testing-library/jest-dom/extend-expect';

/**
 * Have to import "/pure" here to not register afterEach() hook clean up
 * in the very beginning. There are couple tests which fail with clean up hook.
 * On CI they run before first test which imports '@testing-library/react'
 * and registers afterEach hook so the whole suite is passing.
 * This have to be fixed as we depend on test order execution
 * https://github.com/elastic/kibana/issues/59469
 */
import { configure } from '@testing-library/react/pure';

// instead of default 'data-testid', use kibana's 'data-test-subj'
configure({ testIdAttribute: 'data-test-subj' });

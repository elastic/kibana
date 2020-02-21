/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npSetup } from 'ui/new_platform';
import { renderFunctions } from '../canvas_plugin_src/renderers';

renderFunctions.forEach(npSetup.plugins.expressions.registerRenderer);

export default renderFunctions;

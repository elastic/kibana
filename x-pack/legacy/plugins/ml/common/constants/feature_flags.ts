/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// This flag is used on the server side as the default setting.
// Plugin initialization does some additional integrity checks and tests if the necessary
// indices and aliases exist. Based on that the final setting will be available
// as an injectedVar on the client side and can be accessed like:
//

export const FEATURE_ANNOTATIONS_ENABLED = true;

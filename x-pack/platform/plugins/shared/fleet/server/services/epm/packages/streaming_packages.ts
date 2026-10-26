/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The security_detection_engine package contains a large number of assets and
// is not suitable for regular installation as it might cause OOM errors.
export const PACKAGES_TO_INSTALL_WITH_STREAMING = ['security_detection_engine'];

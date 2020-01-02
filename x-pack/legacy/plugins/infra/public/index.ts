/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// NP_NOTE: Whilst we are in the transition period of the NP migration, this index file
// is exclusively for our static code exports that other plugins (e.g. APM) use.
// When we switch over to the real NP, and an export of "plugin" is expected and called,
// we can do away with the middle "app.ts" layer. The "app.ts" layer is needed for now,
// and needs to be situated differently to this index file, so that our code for setting the root template
// and attempting to start the app doesn't try to run just because another plugin is importing from this file.

export { useTrackPageview } from './hooks/use_track_metric';

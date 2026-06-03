/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The create flyout shares the same wizard component as the edit flyout —
// just configured for the empty-draft "create" mode. Kept as a thin
// re-export so callers (e.g. `ManageEntityTypesView`) don't need to know
// the two surfaces collapsed into one.
export { CreateEntityTypeFlyout } from './edit_flyout/edit_flyout';

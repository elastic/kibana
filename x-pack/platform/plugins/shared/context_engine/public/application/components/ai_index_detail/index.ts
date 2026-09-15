/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { AutomationRow } from './automation_row';
export { AutomationsPanel } from './automations_panel';
export { DescriptionPanel } from './description_panel';
export { LockedSectionPanel } from './locked_section_panel';
export { ScopedImprovements } from './scoped_improvements';
/**
 * Not on the detail page: suggestions are shown in the panel they would change, so there is no
 * signals surface to drill into. Kept for the flyouts it owns and for when signals get a home.
 */
export { SignalsPanel } from './signals_panel';
export { SourcesPanel } from './sources_panel';
export { TracesPanel } from './traces_panel';

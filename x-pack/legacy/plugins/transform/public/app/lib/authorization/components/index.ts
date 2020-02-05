/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { createCapabilityFailureMessage, Privileges } from './common';
export { AuthorizationProvider, AuthorizationContext } from './authorization_provider';
export { PrivilegesWrapper } from './with_privileges';
export { NotAuthorizedSection } from './not_authorized_section';

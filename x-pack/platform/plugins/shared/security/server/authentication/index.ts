/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { canRedirectRequest } from './can_redirect_request';
export type { InternalAuthenticationServiceStart } from './authentication_service';
export { AuthenticationService } from './authentication_service';
export { AuthenticationResult } from './authentication_result';
export { DeauthenticationResult } from './deauthentication_result';
export {
  OIDCLogin,
  SAMLLogin,
  BasicAuthenticationProvider,
  TokenAuthenticationProvider,
  SAMLAuthenticationProvider,
  OIDCAuthenticationProvider,
  AnonymousAuthenticationProvider,
  HTTPAuthenticationProvider,
} from './providers';
export { BasicHTTPAuthorizationHeaderCredentials } from './http_authentication';

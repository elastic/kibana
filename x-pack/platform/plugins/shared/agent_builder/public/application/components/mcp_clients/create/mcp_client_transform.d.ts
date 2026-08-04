import type { OAuthClientLogo } from '@kbn/agent-builder-common';
import type { ClientLogo, McpClientFormData } from './types';
import type { CreateOAuthClientPayload } from '../../../../../common/http_api/oauth_clients';
export declare const toClientLogoPayload: (clientLogo: ClientLogo) => OAuthClientLogo | undefined;
export declare const toCreateOAuthClientPayload: ({ clientName, clientLogo, redirect, isConfidential, }: McpClientFormData) => CreateOAuthClientPayload;

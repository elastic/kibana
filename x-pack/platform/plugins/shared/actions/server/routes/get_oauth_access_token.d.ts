import type { TypeOf } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import type { ILicenseState } from '../lib';
import type { ActionsRequestHandlerContext } from '../types';
import type { ActionsConfigurationUtilities } from '../actions_config';
declare const oauthJwtBodySchema: import("@kbn/config-schema").ObjectType<{
    tokenUrl: import("@kbn/config-schema").Type<string>;
    config: import("@kbn/config-schema").ObjectType<{
        clientId: import("@kbn/config-schema").Type<string>;
        jwtKeyId: import("@kbn/config-schema").Type<string>;
        userIdentifierValue: import("@kbn/config-schema").Type<string>;
    }>;
    secrets: import("@kbn/config-schema").ObjectType<{
        clientSecret: import("@kbn/config-schema").Type<string>;
        privateKey: import("@kbn/config-schema").Type<string>;
        privateKeyPassword: import("@kbn/config-schema").Type<string | undefined>;
    }>;
}>;
export type OAuthJwtParams = TypeOf<typeof oauthJwtBodySchema>;
declare const oauthClientCredentialsBodySchema: import("@kbn/config-schema").ObjectType<{
    tokenUrl: import("@kbn/config-schema").Type<string>;
    scope: import("@kbn/config-schema").Type<string>;
    config: import("@kbn/config-schema").ObjectType<{
        clientId: import("@kbn/config-schema").Type<string>;
    }>;
    secrets: import("@kbn/config-schema").ObjectType<{
        clientSecret: import("@kbn/config-schema").Type<string>;
    }>;
}>;
export type OAuthClientCredentialsParams = TypeOf<typeof oauthClientCredentialsBodySchema>;
declare const oauthAuthorizationCodeBodySchema: import("@kbn/config-schema").ObjectType<{
    connectorId: import("@kbn/config-schema").Type<string>;
    tokenUrl: import("@kbn/config-schema").Type<string>;
    scope: import("@kbn/config-schema").Type<string | undefined>;
    config: import("@kbn/config-schema").ObjectType<{
        clientId: import("@kbn/config-schema").Type<string>;
        tokenUrl: import("@kbn/config-schema").Type<string>;
    }>;
    secrets: import("@kbn/config-schema").ObjectType<{
        clientSecret: import("@kbn/config-schema").Type<string>;
    }>;
}>;
export type OAuthAuthorizationCodeParams = TypeOf<typeof oauthAuthorizationCodeBodySchema>;
declare const bodySchema: import("@kbn/config-schema").ObjectType<{
    type: import("@kbn/config-schema").Type<"client" | "jwt" | "authorization_code">;
    options: import("@kbn/config-schema").ConditionalType<import("@kbn/config-schema").Type<"jwt">, Readonly<{} & {
        config: Readonly<{} & {
            clientId: string;
            jwtKeyId: string;
            userIdentifierValue: string;
        }>;
        secrets: Readonly<{
            privateKeyPassword?: string | undefined;
        } & {
            clientSecret: string;
            privateKey: string;
        }>;
        tokenUrl: string;
    }>, Readonly<{} & {
        config: Readonly<{} & {
            clientId: string;
        }>;
        scope: string;
        secrets: Readonly<{} & {
            clientSecret: string;
        }>;
        tokenUrl: string;
    }> | Readonly<{
        scope?: string | undefined;
    } & {
        config: Readonly<{} & {
            clientId: string;
            tokenUrl: string;
        }>;
        connectorId: string;
        secrets: Readonly<{} & {
            clientSecret: string;
        }>;
        tokenUrl: string;
    }>>;
}>;
export type OAuthParams = TypeOf<typeof bodySchema>;
export declare const getOAuthAccessToken: (router: IRouter<ActionsRequestHandlerContext>, licenseState: ILicenseState, configurationUtilities: ActionsConfigurationUtilities) => void;
export {};

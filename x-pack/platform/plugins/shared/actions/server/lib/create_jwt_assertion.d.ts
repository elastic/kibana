import type { Logger } from '@kbn/core/server';
export interface JWTClaims {
    audience: string;
    subject: string;
    issuer: string;
    expireInMilliseconds?: number;
    keyId?: string;
}
export declare function createJWTAssertion(logger: Logger, privateKey: string, privateKeyPassword: string | null, reservedClaims: JWTClaims): string;

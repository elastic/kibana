import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { FakeRequestEnricher } from '@kbn/core-security-server';
import type { Logger } from '@kbn/logging';
export interface FakeRequestEnrichment {
    enrichRequestWithUserProfile: FakeRequestEnricher;
    getOverride(request: KibanaRequest): AuthenticatedUser | undefined;
}
export declare const createFakeRequestEnrichment: (logger: Logger) => FakeRequestEnrichment;

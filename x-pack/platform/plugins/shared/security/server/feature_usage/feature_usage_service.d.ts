import type { FeatureUsageServiceSetup, FeatureUsageServiceStart } from '@kbn/licensing-plugin/server';
interface SetupDeps {
    featureUsage: FeatureUsageServiceSetup;
}
interface StartDeps {
    featureUsage: FeatureUsageServiceStart;
}
export interface SecurityFeatureUsageServiceStart {
    recordPreAccessAgreementUsage: () => void;
    recordSubFeaturePrivilegeUsage: () => void;
    recordAuditLoggingUsage: () => void;
}
export declare class SecurityFeatureUsageService {
    setup({ featureUsage }: SetupDeps): void;
    start({ featureUsage }: StartDeps): SecurityFeatureUsageServiceStart;
}
export {};

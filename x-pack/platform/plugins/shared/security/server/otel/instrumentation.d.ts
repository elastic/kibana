interface BasicAttributes {
    outcome: 'success' | 'failure';
}
interface PrivilegeRegistrationAttributes extends BasicAttributes {
    application: string;
    deletedPrivileges?: number;
}
interface UserAuthenticationAttributes extends BasicAttributes {
    providerType: string;
}
interface GetCurrentProfileAttributes extends BasicAttributes {
    profileActivationRequired?: boolean;
    apiKeyRetrievalRequired?: boolean;
    fakeRequestProfileResolution?: boolean;
}
export type SecurityTelemetryAttributes = Partial<BasicAttributes> & Partial<PrivilegeRegistrationAttributes> & Partial<UserAuthenticationAttributes> & Partial<GetCurrentProfileAttributes>;
declare class SecurityTelemetry {
    private readonly meter;
    private readonly loginDuration;
    private readonly userProfileActivationDuration;
    private readonly sessionCreationDuration;
    private readonly logoutCounter;
    private readonly privilegeRegistrationDuration;
    private readonly getCurrentProfileCounter;
    private readonly getCurrentProfileIdCounter;
    private readonly oauthTokenExchangeAttempts;
    private readonly oauthTokenExchangeDuration;
    private readonly DEFAULT_BUCKET_BOUNDARIES;
    private readonly PRIVILEGE_REGISTRATION_BUCKET_BOUNDARIES;
    private readonly LOGIN_DURATION_BUCKET_BOUNDARIES;
    constructor();
    private transformAttributes;
    recordLoginDuration: (duration: number, attributes: UserAuthenticationAttributes) => void;
    recordUserProfileActivationDuration: (duration: number, attributes: UserAuthenticationAttributes) => void;
    recordSessionCreationDuration: (duration: number, attributes: UserAuthenticationAttributes) => void;
    recordLogoutAttempt: (attributes: BasicAttributes) => void;
    recordPrivilegeRegistrationDuration: (duration: number, attributes: PrivilegeRegistrationAttributes) => void;
    recordGetCurrentProfileInvocation: (attributes: GetCurrentProfileAttributes) => void;
    recordGetCurrentProfileIdInvocation: (attributes: GetCurrentProfileAttributes) => void;
    recordOAuthTokenExchangeAttempt: (duration: number, attributes: BasicAttributes) => void;
}
export declare const securityTelemetry: SecurityTelemetry;
export {};

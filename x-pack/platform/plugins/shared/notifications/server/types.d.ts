import type { EmailServiceStart, EmailServiceSetupDeps, EmailServiceStartDeps } from './services';
export type NotificationsServerSetup = void;
export type NotificationsServerStart = EmailServiceStart;
export type NotificationsServerSetupDependencies = EmailServiceSetupDeps;
export type NotificationsServerStartDependencies = EmailServiceStartDeps;

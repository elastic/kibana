import type { RuleNotificationsValue } from '../../../form/types';
export declare const isNotificationsStepValid: (notifications: RuleNotificationsValue | undefined) => boolean;
/** RHF `rules.validate` for notifications — `true` or an i18n error message. */
export declare const validateNotifications: (notifications: RuleNotificationsValue | undefined) => true | string;

import type { User } from '../../../common';
export declare const isUserReserved: (user: User) => boolean;
export declare const isUserDeprecated: (user: User) => boolean;
export declare const getExtendedUserDeprecationNotice: (user: User) => string;

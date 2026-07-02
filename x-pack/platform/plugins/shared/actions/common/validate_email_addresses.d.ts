import type { ValidatedEmail } from './types';
/** Options that can be used when validating email addresses */
export interface ValidateEmailAddressesOptions {
    /** treat any address which contains a mustache template as valid */
    treatMustacheTemplatesAsValid?: boolean;
    isSender?: boolean;
}
export declare const isAddressMatchingSomePattern: (address: string, patterns: string[]) => boolean;
export declare function validateEmailAddressesAsAlwaysValid(addresses: string[]): ValidatedEmail[];
export declare function validateEmailAddresses(allowedDomains: string[] | null | undefined, addresses: string[], options?: ValidateEmailAddressesOptions, recipientAllowlist?: string[] | null): ValidatedEmail[];
export declare function invalidEmailsAsMessage(validatedEmails: ValidatedEmail[]): string | undefined;

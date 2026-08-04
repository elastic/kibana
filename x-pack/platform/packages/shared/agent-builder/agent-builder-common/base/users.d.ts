export interface UserIdAndName {
    /** profile UUID */
    id?: string;
    /** username */
    username: string;
}
/**
 * Identity of the authenticated requester used in authorization decisions.
 *
 * Distinguished from {@link UserIdAndName} (which is a generic user reference, e.g. an
 * agent's stored `created_by` snapshot) so call sites can document intent: a parameter
 * typed `CurrentUser` carries the request's identity, not an arbitrary persisted reference.
 */
export interface CurrentUser extends UserIdAndName {
}

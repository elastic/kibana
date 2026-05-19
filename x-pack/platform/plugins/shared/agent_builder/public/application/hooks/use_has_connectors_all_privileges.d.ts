/**
 * Returns true if the user has access to connectors with all privileges.
 * Currently used in the Agent Builder application to determine whether to show the Gen AI Settings external links.
 *
 * @returns {boolean} True if the user has all connector privileges (show, execute, delete, save)
 */
export declare const useHasConnectorsAllPrivileges: () => boolean;

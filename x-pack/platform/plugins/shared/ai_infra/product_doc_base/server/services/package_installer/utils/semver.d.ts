/**
 * @param availableVersions - List of available versions
 * @param kibanaVer - Kibana version
 * @returns The latest version from the list
 * If kibanaVer is provided, return the previous closest version available
 */
export declare const latestVersion: (availableVersions: string[], kibanaVer?: string) => string;
export declare const majorMinor: (version: string) => string;

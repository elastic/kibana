/**
 * Extract the package name and package version from a string.
 *
 * @param pkgkey a string containing the package name delimited by the package version
 */
export declare function splitPkgKey(pkgkey: string): {
    pkgName: string;
    pkgVersion: string;
};

/**
 * Parses a seed node string into address and port components
 * Handles IPv4, IPv6 (bracketed and unbracketed), and hostnames
 */
export declare function extractHostAndPort(seedNode: string): {
    host?: string;
    port?: string;
} | undefined;
/**
 * Validates the host part of a seed node string.
 * Seed node can be in variations of:
 *
 * - hostname
 * - ipv4
 * - ipv6 (bracketed and unbracketed)
 * - hostname:port
 * - ipv4:port
 * - [ipv6]:port
 * ... etc
 */
export declare function isAddressValid(seedNode?: string): boolean;
/**
 * Validates the port part of a seed node string.
 * Seed node can be in variations of:
 *
 * - hostname
 * - ipv4
 * - ipv6 (bracketed and unbracketed)
 * - hostname:port
 * - ipv4:port
 * - [ipv6]:port
 * ... etc
 */
export declare function isPortValid(seedNode?: string): boolean;

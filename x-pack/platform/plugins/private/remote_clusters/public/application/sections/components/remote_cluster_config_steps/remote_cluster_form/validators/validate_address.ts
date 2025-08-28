/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const IP4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const IP4_EXACT_RE = new RegExp(`^(${IP4_RE.source})$`);

function isValidIPv4(address: string): boolean {
  if (!IP4_EXACT_RE.test(address)) return false;

  return address.split('.').every((strSegment) => {
    const numSegment = parseInt(strSegment, 10);
    // Each part must be a number between 0-255
    // and must match unparsed represention (e.g., "01" -> 1 is invalid)
    return numSegment >= 0 && numSegment <= 255 && strSegment === numSegment.toString();
  });
}

const HOSTNAME_HEX_RE = /^[a-z0-9\-]+$/i;

function isValidHostnameSegment(segment: string): boolean {
  return HOSTNAME_HEX_RE.test(segment);
}

function isValidHostname(hostname: string): boolean {
  return hostname.split('.').every(isValidHostnameSegment);
}

const IP6_HEX_RE = /^[0-9a-f]{1,4}$/i;

function isValidIPv6Segment(segment: string): boolean {
  return IP6_HEX_RE.test(segment);
}

/**
 * Removes zone identifier from IPv6 address (e.g., fe80::1234%eth0)
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc4007#section-11|RFC4007 Section}
 */
function removeZoneIdentifier(address: string): string {
  return address.split('%')[0];
}

/**
 * Validates the IPv6 part that comes before IPv4 in IPv4-mapped addresses
 *
 * @see {@link https://datatracker.ietf.org/doc/html/rfc4291#section-2.5.5.2|RFC4291 Section}
 */
function isValidIPv6Prefix(prefix: string): boolean {
  // Must end with : or :: and contain valid hex segments
  // ex. ::ffff: or 2001:db8::
  if (!prefix.match(/^([0-9A-F]{0,4}:)+:?$/)) return false;

  // Check individual segments
  const segments = prefix.slice(0, -1).split(':'); // Remove trailing :
  return segments.every((seg) => seg === '' || isValidIPv6Segment(seg));
}

const IP4_MAPPED_IPV6_RE = new RegExp(`^(.*:)(${IP4_RE})$`);

/**
 * Validates IPv4-mapped IPv6 address (e.g., ::ffff:192.168.1.1)
 */
function isValidIPv4MappedIPv6(address: string): boolean {
  const match = address.match(IP4_MAPPED_IPV6_RE);
  if (!match) return false;

  const [, ipv6Prefix, ipv4Part] = match;
  return isValidIPv6Prefix(ipv6Prefix) && isValidIPv4(ipv4Part);
}

/**
 * Validates compressed IPv6 notation (containing ::)
 */
function isValidCompressedIPv6(address: string): boolean {
  // Only one :: is allowed
  const doubleColonCount = (address.match(/::/g) || []).length;
  if (doubleColonCount !== 1) return false;

  // Special case: just ::
  if (address === '::') return true;

  const [leftPart, rightPart] = address.split('::');

  // Validate left side segments
  if (leftPart) {
    const leftSegments = leftPart.split(':');
    if (!leftSegments.every(isValidIPv6Segment)) return false;
  }

  // Validate right side segments
  if (rightPart) {
    // Check if right part ends with IPv4
    if (rightPart.includes('.')) {
      const lastColonIndex = rightPart.lastIndexOf(':');
      if (lastColonIndex > -1) {
        // Has both IPv6 segments and IPv4
        const ipv6Part = rightPart.substring(0, lastColonIndex);
        const ipv4Part = rightPart.substring(lastColonIndex + 1);
        const ipv6Segments = ipv6Part.split(':');
        return ipv6Segments.every(isValidIPv6Segment) && isValidIPv4(ipv4Part);
      } else {
        // Just IPv4 after ::
        return isValidIPv4(rightPart);
      }
    } else {
      // Regular IPv6 segments
      const rightSegments = rightPart.split(':');
      if (!rightSegments.every(isValidIPv6Segment)) return false;
    }
  }

  return true;
}

/**
 * Validates full/expanded IPv6 notation (without ::)
 */
function isValidFullIPv6(address: string): boolean {
  const segments = address.split(':');

  // Check for IPv4 suffix
  const lastSegment = segments[segments.length - 1];
  const hasIPv4Suffix = lastSegment.includes('.');

  if (hasIPv4Suffix) {
    // Should have 6 IPv6 segments + 1 IPv4
    if (segments.length !== 7) return false;
    if (!isValidIPv4(lastSegment)) return false;
    // Validate IPv6 segments
    return segments.slice(0, -1).every(isValidIPv6Segment);
  } else {
    // Should have exactly 8 IPv6 segments
    if (segments.length !== 8) return false;
    return segments.every(isValidIPv6Segment);
  }
}

/**
 * Validates any IPv6 address format
 */
function isValidIPv6(address: string): boolean {
  const cleanAddress = removeZoneIdentifier(address);

  // Check for IPv4-mapped IPv6
  if (cleanAddress.includes('.')) {
    const hasDoubleColon = cleanAddress.includes('::');
    if (hasDoubleColon) {
      // Compressed IPv6 with IPv4 (handled in compressed validation)
      return isValidCompressedIPv6(cleanAddress);
    } else {
      // Could be full form with IPv4 or IPv4-mapped
      return isValidFullIPv6(cleanAddress) || isValidIPv4MappedIPv6(cleanAddress);
    }
  }

  if (cleanAddress.includes('::')) {
    return isValidCompressedIPv6(cleanAddress);
  } else {
    return isValidFullIPv6(cleanAddress);
  }
}

/**
 * Extracts the address part and port from a seed node string
 */
function parseAddressAndPort(seedNode: string): { address: string; port?: string } {
  // Check for bracketed IPv6
  if (seedNode.startsWith('[')) {
    const bracketEnd = seedNode.indexOf(']');
    if (bracketEnd === -1) {
      return { address: '' }; // Invalid - no closing bracket
    }

    const address = seedNode.substring(1, bracketEnd);
    const remainder = seedNode.substring(bracketEnd + 1);

    // Check for port after bracket
    if (remainder.startsWith(':')) {
      return { address, port: remainder.substring(1) };
    }

    return { address };
  }

  // IPv4 or hostname - split by last colon for port
  const lastColon = seedNode.lastIndexOf(':');
  const colonCount = (seedNode.match(/:/g) || []).length;

  // If multiple colons and not bracketed, it's likely IPv6 without port
  if (colonCount > 1) {
    return { address: seedNode };
  }

  if (lastColon > -1) {
    return {
      address: seedNode.substring(0, lastColon),
      port: seedNode.substring(lastColon + 1),
    };
  }

  return { address: seedNode };
}

/**
 * Validates the address portion of a seed node
 */
export function isAddressValid(seedNode?: string): boolean {
  if (!seedNode) return false;

  // Handle bracketed addresses (IPv6)
  if (seedNode.startsWith('[')) {
    const bracketEnd = seedNode.indexOf(']');
    if (bracketEnd === -1) return false;

    const ipv6Address = seedNode.substring(1, bracketEnd);
    return isValidIPv6(ipv6Address);
  }

  // Extract address part (before port)
  const { address } = parseAddressAndPort(seedNode);
  if (!address) return false;

  // Check if it's IPv6 (has multiple colons)
  if ((address.match(/:/g) || []).length > 1) {
    return isValidIPv6(address);
  }

  // Check if it looks like an IPv4 attempt (all segments are numeric)
  const segments = address.split('.');
  const looksLikeIPv4 = segments.length > 1 && segments.every((seg) => /^\d+$/.test(seg));

  if (looksLikeIPv4) {
    // Validate strictly as IPv4 - must have exactly 4 valid segments
    return isValidIPv4(address);
  }

  // Otherwise validate as hostname
  return isValidHostname(address);
}

/**
 * Validates the port portion of a seed node
 */
export function isPortValid(seedNode?: string): boolean {
  if (!seedNode) return false;

  const { port } = parseAddressAndPort(seedNode);

  // Must have a port
  if (!port) return false;

  // Port must be numeric only
  return /^\d+$/.test(port);
}

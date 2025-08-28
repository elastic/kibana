/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IPv4, IPv6 } from 'ipaddr.js';

const HOSTNAME_SEGMENT_RE = /^[a-z0-9\-]+$/i;

function isValidHostnameSegment(segment: string): boolean {
  return HOSTNAME_SEGMENT_RE.test(segment);
}

function isValidHostname(hostname: string): boolean {
  return hostname.split('.').every(isValidHostnameSegment);
}

/**
 * Helps determine if an address is numeric IPv4-like
 * but not necessarily valid IPv4 so we can validate in place
 * and exit without going through ipv6 or hostname checks
 *
 * ex. "1.1", "1.2.3"
 */
function looksLikeIPv4(address: string): boolean {
  // If it contains dots and all segments are numeric, it's an IPv4 attempt
  if (!address.includes('.')) return false;

  const segments = address.split('.');
  return segments.every((seg) => /^\d+$/.test(seg));
}

const IP4_RE = /^\d+\.\d+\.\d+\.\d+$/;

function isValidIPv4(address: string): boolean {
  // ipaddr.js is permissive with ip4 addresses, allowing things like "1", "1.2", "1.2.3"
  // We want to enforce the full four-octet format, so we add this stricter regex check first
  return IP4_RE.test(address) && IPv4.isValid(address);
}

/**
 * Parses a seed node string into address and port components
 * Handles IPv4, IPv6 (bracketed and unbracketed), and hostnames
 */
function parseAddressAndPort(seedNode: string): { address?: string; port?: string } | undefined {
  // Check for bracketed IPv6
  if (seedNode.startsWith('[')) {
    const bracketEnd = seedNode.indexOf(']');
    if (bracketEnd === -1) {
      return undefined;
    }

    const address = seedNode.substring(1, bracketEnd);
    const remainder = seedNode.substring(bracketEnd + 1);

    // Check for port after bracket
    if (remainder.startsWith(':')) {
      return { address, port: remainder.substring(1) };
    }

    return { address };
  }

  // Check if it's a valid IPv6 without brackets
  // If so, return as address only (no port)
  // because IPv6 with port must be bracketed
  if (IPv6.isValid(seedNode)) {
    return { address: seedNode };
  }

  // For IPv4 or hostname, only allow single colon for port
  const colonCount = (seedNode.match(/:/g) || []).length;

  // Multiple colons in non-IPv6 context means invalid format
  if (colonCount > 1) {
    // It's not a valid IPv6 (we checked above), so multiple colons are invalid
    return undefined;
  }

  // Safe to split on colon for port
  if (colonCount === 1) {
    const colonIndex = seedNode.indexOf(':');
    return {
      address: seedNode.substring(0, colonIndex),
      port: seedNode.substring(colonIndex + 1),
    };
  }

  // No port, just return address
  return { address: seedNode };
}

/**
 * Validates the address part of a seed node string.
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
export function isAddressValid(seedNode?: string): boolean {
  if (!seedNode) return false;

  // Handle bracketed addresses (IPv6)
  if (seedNode.startsWith('[')) {
    const bracketEnd = seedNode.indexOf(']');
    if (bracketEnd === -1) return false;

    const ipv6Address = seedNode.substring(1, bracketEnd);
    return IPv6.isValid(ipv6Address);
  }

  const { address } = parseAddressAndPort(seedNode) ?? {};
  if (!address) return false;

  if (looksLikeIPv4(address)) {
    return isValidIPv4(address);
  }

  // Try to validate as IPv6 without brackets
  //
  // Note: While bracketed IPv6 is the standard when specifying ip with ports,
  // Unbracketed IPv6 is still valid as an address alone
  //
  // ex. "2001:db8::1", "::1", "::"
  if (IPv6.isValid(address)) {
    return true;
  }

  return isValidHostname(address);
}

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
export function isPortValid(seedNode?: string): boolean {
  if (!seedNode) return false;

  const { address, port } = parseAddressAndPort(seedNode) ?? {};

  // Must have both valid address and port
  if (!address || !port) return false;

  return /^\d+$/.test(port);
}

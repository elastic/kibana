import { relativeToAbsolute } from './relative_to_absolute';
import { parse } from 'url';

/**
 * Returns the protocol and host of the page from where this function is called.
 * @return {{protocol: {string}, host: {string}}}
 */
export function getProtocolAndHost() {
  const absoluteUrl = relativeToAbsolute('');
  const { protocol, host } = parse(absoluteUrl);
  return { protocol, host };
}

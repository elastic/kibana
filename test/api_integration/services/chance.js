import Chance from 'chance';

export function ChanceProvider({ getService }) {
  const log = getService('log');

  const seed = Date.now();
  log.debug('randomness seed: %j', seed);

  return new Chance(seed);
}

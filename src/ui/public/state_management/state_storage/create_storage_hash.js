import { Sha256 } from 'ui/crypto';

export default function createStorageHash(json) {
  return new Sha256().update(json, 'utf8').digest('hex');
}

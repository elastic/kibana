import { resolve } from 'path';
import { readFileSync } from 'fs';

export function generateNodeNoticeText(nodeDir) {
  const licensePath = resolve(nodeDir, 'LICENSE');
  const license = readFileSync(licensePath, 'utf8');
  return `This product bundles Node.js.\n\n${license}`;
}

import { resolve } from 'path';
import { readFileSync } from 'fs';

import { generatePackageNoticeText } from './package_notice';
import { generateNodeNoticeText } from './node_notice';

const BASE_NOTICE = resolve(__dirname, './base_notice.txt');

/**
 *  When given a list of packages and the directory to the
 *  node distribution that will be shipping with Kibana,
 *  generates the text for NOTICE.txt
 *
 *  @param  {Object} [options={}]
 *  @property {Array<Package>} options.packages List of packages to check, see
 *                                              getInstalledPackages() in ../packages
 *  @property {string} options.nodeDir The directory containing the version of node.js
 *                                     that will ship with Kibana
 *  @return {undefined}
 */
export async function generateNoticeText(options = {}) {
  const { packages, nodeDir } = options;

  const packageNotices = await Promise.all(
    packages.map(generatePackageNoticeText)
  );

  return [
    readFileSync(BASE_NOTICE, 'utf8'),
    ...packageNotices,
    generateNodeNoticeText(nodeDir),
  ].join('\n---\n');
}

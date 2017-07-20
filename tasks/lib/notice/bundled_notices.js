import { resolve } from 'path';
import { readFile } from 'fs';

import { fromNode as fcb } from 'bluebird';
import glob from 'glob';

export async function getBundledNotices(packageDirectory) {
  const pattern = resolve(packageDirectory, '*{LICENSE,NOTICE}*');
  const paths = await fcb(cb => glob(pattern, cb));
  return Promise.all(paths.map(async path => ({
    path,
    text: await fcb(cb => readFile(path, 'utf8', cb))
  })));
}

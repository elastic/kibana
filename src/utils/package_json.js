import { existsSync } from 'fs';
import { join } from 'path';

let packageDir;
let packagePath;

while (!packagePath || !existsSync(packagePath)) {
  let prev = packageDir;
  packageDir = prev ? join(prev, '..') : __dirname;
  packagePath = join(packageDir, 'package.json');

  if (prev === packageDir) {
    // if going up a directory doesn't work, we
    // are already at the root of the filesystem
    throw new Error('unable to find package.json');
  }
}


module.exports = require(packagePath);
module.exports.__filename = packagePath;
module.exports.__dirname = packageDir;

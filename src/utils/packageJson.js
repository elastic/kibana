var { join } = require('path');
var existsSync = require('fs').existsSync;

var packageDir;
var packagePath;

while (!packagePath || !existsSync(packagePath)) {
  var prev = packageDir;
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

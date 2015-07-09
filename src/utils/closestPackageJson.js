var join = require('path').join;
var existsSync = require('fs').existsSync;

var packageDir;

function packagePath() {
  return join(packageDir, 'package.json');
}

function findSync() {
  if (packageDir) return packagePath();

  packageDir = __dirname;
  while (!existsSync(packagePath())) {
    var prev = packageDir;
    packageDir = join(packageDir, '..');

    if (prev === packageDir) {
      // if going up a directory doesn't work, we
      // are already at the root of the filesystem

      packageDir = null;
      throw new Error('unable to find package.json');
    }
  }

  return packagePath();
}

function getSync() {
  return require(findSync());
}

exports.getSync = getSync;
exports.findSync = findSync;

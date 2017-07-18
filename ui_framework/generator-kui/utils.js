function makeComponentName(str) {
  const words = str.split('_');

  const componentName = words.map(function(word) {
    return upperCaseFirstLetter(word);
  }).join('');

  return `Kui${componentName}`;
}

function lowerCaseFirstLetter(str) {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toLowerCase() + txt.substr(1);
  });
}

function upperCaseFirstLetter(str) {
  return str.replace(/\w\S*/g, function(txt) {
    return txt.charAt(0).toUpperCase() + txt.substr(1);
  });
}

function addDirectoryToPath(path, dirName, shouldMakeDirectory) {
  if (shouldMakeDirectory) {
    return path + '/' + dirName;
  }
  return path;
}

function makePathRelative(path) {
  return path;
  if (!path) {
    // Leave out the trailing slash deliberately.
    return '.';
  }
  if (path.indexOf('./') === 0) {
    return path;
  }
  return './' + path;
}

module.exports = {
  makeComponentName: makeComponentName,
  lowerCaseFirstLetter: lowerCaseFirstLetter,
  upperCaseFirstLetter: upperCaseFirstLetter,
  addDirectoryToPath: addDirectoryToPath,
  makePathRelative: makePathRelative,
};

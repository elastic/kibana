import _ from 'lodash';

module.exports = updateVersion;

const versions = [
  'major',
  'minor',
  'patch',
  'tag'
];

/**
 * change the version based on a basic expression
 *
 * Expressions have two pieces, the version piece to
 * set and the new value. If the version peice is not
 * "tag" then the new value can be left of and the preivous
 * value will simply be incremented by one. if the version
 * peice is tag, some special rules apply:
 *     1. leaving the value empty will remove a tag
 *     2. adding a new tag bumps the minor version
 *
 * examples:
 *
 *  expr: minor
 *  1.4.1 => 1.5.0
 *
 *  expr: minor=10
 *  1.5.5 => 1.10.0
 *
 *  expr: major=4
 *  0.0.1 => 4.0.0
 *
 *  expr: tag=beta2
 *  4.0.0-beta1 => 4.0.0-beta2
 *
 *  expr: tag=snapshot
 *  4.0.0 => 4.1.0-snapshot
 *
 *  expr: tag=
 *  4.0.0-rc1 => 4.0.0
 *
 */
function updateVersion(version, expr) {
  expr = String(expr).split('=');

  const change = {
    name: expr[0],
    val: expr[1] || null
  };

  if (!_.contains(versions, change.name)) {
    throw new Error('version update expression needs to start with one of ' + versions.join(', '));
  }

  if (change.name === 'tag' && change.val) {
    change.val = change.val.toLowerCase();
  }

  // parse the current version
  const parts = _.chain(version.split('.'))

  // ensure that their are three pieces, either x.x.x or x.x.x-y
  .tap(function (versionNumbers) {
    if (versionNumbers.length !== 3) {
      throw new Error('Version number "' + version + '" should have two dots, like 4.1.0');
    }
  })

  // describe all of the version parts with a name, parse
  // the numbers, and extract tag from patch
  .transform(function (parts, v, i) {
    const name = versions[i];

    if (name !== 'patch') {
      parts[name] = _.parseInt(v);
      return;
    }

    // patch is two parts, a version number and an optional tag
    v = v.split('-');
    parts.patch = _.parseInt(v.shift());
    parts.tag = v.join('-');
  }, {})

  // sanity check
  .tap(function (parts) {

    let valid = true;
    valid = valid && _.isNumber(parts.major);
    valid = valid && _.isNumber(parts.minor);
    valid = valid && _.isNumber(parts.patch);
    valid = valid && _.isString(parts.tag);

    if (!valid) {
      throw new Error('Unable to parse version "' + version + '"');
    }

  })

  // perform the change on parts
  .tap(function (parts) {
    if (change.name === 'tag' && change.val && !parts.tag) {
      // special operation that doesn't follow the natural rules
      parts.minor += 1;
      parts.patch = 0;
      parts.tag = change.val;
      return;
    }

    // since the version parts are in order from left to right, the update
    // reset all of the values to the right of it:
    //
    // 0.12.3-beta -> 1.0.0 (increment major, reset everything else)

    // primary update
    if (change.name === 'tag') {
      parts[change.name] = change.val;
    } else {
      parts[change.name] = (change.val == null) ? parts[change.name] + 1 : change.val;
    }

    // properties that are zero-d by the previous update
    const emptyUpdates = versions.slice(versions.indexOf(change.name) + 1);
    while (emptyUpdates.length) {
      parts[emptyUpdates.shift()] = '';
    }
  })
  .value();

  return (parts.major || 0) + '.' +
         (parts.minor || 0) + '.' +
         (parts.patch || 0) + (parts.tag ? '-' + parts.tag : '');
}

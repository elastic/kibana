define(function (require) {
  var _ = require('lodash');

  function VersionMathException(message) {
    this.message = message;
    this.name = 'VersionMathException';
  }

  // Get the max version in this cluster
  function max(versions) {
    return sortVersions(versions).pop();
  }

  // Return the lowest version in the cluster
  function min(versions) {
    return sortVersions(versions).shift();
  }

  // Sort versions from lowest to highest
  function sortVersions(versions) {
    if (!_.isArray(versions)) versions = [versions];

    return _.uniq(versions).sort(function (a, b) {
      return compare(a, b) ? -1 : 1;
    });
  }

  /*
    Takes a version string with one of the following optional comparison prefixes: >,>=,<.<=
    and evaluates if the cluster meets the requirement. If the prefix is omitted exact match
    is assumed
  */
  function is(equation, versions) {
    var _versions = sortVersions(versions);
    var _v = equation;
    var _cf;

    if (_v.charAt(0) === '>') {
      _cf = _v.charAt(1) === '=' ? gte(_v.slice(2), _versions) : gt(_v.slice(1), _versions);
    } else if (_v.charAt(0) === '<') {
      _cf = _v.charAt(1) === '=' ? lte(_v.slice(2), _versions) : lt(_v.slice(1), _versions);
    } else {
      _cf = eq(_v, _versions);
    }

    return _cf;
  }

  // check if lowest version in cluster = `version`
  function eq(version, versions) {
    var _versions = sortVersions(versions);
    return version === min(_versions) ? true : false;
  }

  // version > lowest version in cluster?
  function gt(version, versions) {
    var _versions = sortVersions(versions);
    return version === min(_versions) ? false : gte(version, _versions);
  }

  // version < highest version in cluster?
  function lt(version, versions) {
    var _versions = sortVersions(versions);
    return version === max(_versions) ? false : lte(version, _versions);
  }

  // Check if the lowest version in the cluster is >= to `version`
  function gte(version, versions) {
    var _versions = sortVersions(versions);
    return compare(version, min(_versions));
  }

  // Check if the highest version in the cluster is <= to `version`
  function lte(version, versions) {
    var _versions = sortVersions(versions);
    return compare(max(_versions), version);
  }

  // Determine if a specific version meets the minimum requirement
  function compare(required, installed) {
    if (_.isUndefined(installed)) {
      return;
    }

    if (!required || !installed) {
      return undefined;
    }

    var a = installed.split('.');
    var b = required.split('.');
    var i;

    // leave suffixes as is ("RC1 or -SNAPSHOT")
    for (i = 0; i < Math.min(a.length, 3); ++i) {
      a[i] = Number(a[i]);
    }
    for (i = 0; i < Math.min(b.length, 3); ++i) {
      b[i] = Number(b[i]);
    }
    if (a.length === 2) {
      a[2] = 0;
    }

    if (a[0] > b[0]) { return true; }
    if (a[0] < b[0]) { return false; }

    if (a[1] > b[1]) { return true; }
    if (a[1] < b[1]) { return false; }

    if (a[2] > b[2]) { return true; }
    if (a[2] < b[2]) { return false; }

    if (a.length > 3) {
      // rc/beta suffix
      if (b.length <= 3) {
        return false;
      } // no suffix on b -> a<b
      return a[3] >= b[3];
    }
    if (b.length > 3) {
      // b has a suffix but a not -> a>b
      return true;
    }

    return true;
  }


  return {
    min: min,
    max: max,
    is: is,
    eq: eq,
    gt: gt,
    gte: gte,
    lt: lt,
    lte: lte
  };
});

import chrome from '../chrome';

// eslint-disable-next-line @elastic/kibana-custom/no-default-export
export default function AggConfigResult(aggConfig, parent, value, key, filters) {
  this.key = key;
  this.value = value;
  this.aggConfig = aggConfig;
  this.filters = filters;
  this.$parent = parent;

  if (aggConfig.schema.group === 'buckets') {
    this.type = 'bucket';
  } else {
    this.type = 'metric';
  }
}

/**
 * Returns an array of the aggConfigResult and parents up the branch
 * @returns {array} Array of aggConfigResults
 */
AggConfigResult.prototype.getPath = function () {
  return (function walk(result, path) {
    path.unshift(result);
    if (result.$parent) return walk(result.$parent, path);
    return path;
  }(this, []));
};

/**
 * Returns an Elasticsearch filter that represents the result.
 * @returns {object} Elasticsearch filter
 */
AggConfigResult.prototype.createFilter = function () {
  return this.filters || this.aggConfig.createFilter(this.key);
};

AggConfigResult.prototype.toString = function (contentType) {
  const parsedUrl = {
    origin: window.location.origin,
    pathname: window.location.pathname,
    basePath: chrome.getBasePath(),
  };
  return this.aggConfig.fieldFormatter(contentType)(this.value, null, null, parsedUrl);
};

AggConfigResult.prototype.valueOf = function () {
  return this.value;
};

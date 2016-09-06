import { parse as parseUrl } from 'url';

/**
 *  This function extracts the relevant "shards" and "shard_num"
 *  params from the url.
 *
 *  @param {string} testBundleUrl
 *  @return {object} params
 *  @property {number} params.shards - the total number of shards
 *  @property {number} params.shard_num - the current shard number, 1 based
 */
export function getShardingParamsFromUrl(url) {
  const parsedUrl = parseUrl(url, true);
  const parsedQuery = parsedUrl.query || {};

  const params = {};
  if (parsedQuery.shards) {
    params.shards = parseInt(parsedQuery.shards, 10);
  }

  if (parsedQuery.shard_num) {
    params.shard_num = parseInt(parsedQuery.shard_num, 10);
  }

  return params;
}

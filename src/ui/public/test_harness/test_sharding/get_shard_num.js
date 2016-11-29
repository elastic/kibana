import murmurHash3 from 'murmurhash3js';

// murmur hashes are 32bit unsigned integers
const MAX_HASH = Math.pow(2, 32);

/**
*  Determine the shard number for a suite by hashing
*  its name and placing it based on the hash
*
*  @param {number} shardTotal - the total number of shards
*  @param {string} suiteName - the suite name to hash
*  @return {number} shardNum - 1-based shard number
*/
export function getShardNum(shardTotal, suiteName) {
  const hashIntsPerShard = MAX_HASH / shardTotal;

  const hashInt = murmurHash3.x86.hash32(suiteName);

  // murmur3 produces 32bit integers, so we devide it by the number of chunks
  // to determine which chunk the suite should fall in. +1 because the current
  // chunk is 1-based
  const shardNum = Math.floor(hashInt / hashIntsPerShard) + 1;

  // It's not clear if hash32 can produce the MAX_HASH or not,
  // but this just ensures that shard numbers don't go out of bounds
  // and cause tests to be ignored unnecessarily
  return Math.max(1, Math.min(shardNum, shardTotal));
}

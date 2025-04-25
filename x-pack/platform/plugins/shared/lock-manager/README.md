# Elasticsearch Lock Manager

A simple, distributed lock manager built on Elasticsearch.  
Ensures that only one process at a time can hold a named lock, with automatic lease renewal and safe release.

## Example

```ts
import { LockManagerService, LockAcquisitionError } from '@kbn/lock-manager';


async function reIndexWithLock() {
  // Attempt to acquire "my_lock"; if successful, runs the callback.
  const lmService = new LockManagerService(coreSetup, logger);
  return lmService.withLock('my_lock', async () => {
    // …perform your exclusive operation here…
  });
}

reIndexWithLock().catch((err) => {
  if (err instanceof LockAcquisitionError) {
    logger.debug('Re-index already in progress, skipping.');
    return;
  }
  logger.error(`Failed to re-index: ${err.message}`);
});
```

## How It Works
**Atomic Acquire**
Performs one atomic Elasticsearch update that creates a new lock or renews an existing one - so when multiple processes race for the same lock, only one succeeds.

**TTL-Based Lease**
Each lock has a short, fixed lifespan (default 30s) and will automatically expire if not renewed. While your callback is executing, the library quietly refreshes the TTL to keep the lock alive. This safeguards against deadlocks if a Kibana node crashes after having obtained a lock.

Note: If your long-running task (e.g. re-indexing) outlives the lock TTL because the Kibana node crashed, another process could acquire the same lock and start that task again. To prevent duplicate work, include an application-level check (for example, querying Elasticsearch or your own status flag) to verify the operation isn’t already in progress before proceeding.

**Token Fencing**
Each lock operation carries a unique token. Only the process with the matching token can extend or release the lock, preventing stale holders from interfering.
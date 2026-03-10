# @kbn/retry-service

This package provides a retry service with configurable backoff strategies for handling transient errors in server-side code. It implements the [Exponential Backoff and Jitter algorithm](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) by Amazon.

## Usage

```typescript
import { RetryService, fullJitterBackoffFactory } from '@kbn/retry-service';
import type { BackoffFactory } from '@kbn/retry-service';

class MyRetryService extends RetryService {
  protected isRetryableError(error: Error): boolean {
    // Implement your retry logic
    return error.statusCode === 429;
  }
}

const backoffFactory = fullJitterBackoffFactory({
  baseDelay: 100,
  maxBackoffTime: 5000,
});

const retryService = new MyRetryService(logger, backoffFactory, 'MyService');
await retryService.retryWithBackoff(async () => {
  // Your code that might fail
});
```

